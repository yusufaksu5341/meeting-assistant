import Stripe from 'stripe'
import { prisma } from '../lib/prisma.js'

function getStripe(): Stripe {
  const key = process.env['STRIPE_SECRET_KEY']
  if (!key) throw new Error('STRIPE_SECRET_KEY environment variable is not set')
  return new Stripe(key, { apiVersion: '2024-06-20' })
}

export async function createCheckoutSession(userId: string, userEmail: string): Promise<string> {
  const stripe = getStripe()
  const priceId = process.env['STRIPE_PRO_PRICE_ID']
  if (!priceId) throw new Error('STRIPE_PRO_PRICE_ID environment variable is not set')

  const appUrl = process.env['APP_URL'] ?? 'http://localhost:5173'

  let user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('Kullanıcı bulunamadı')

  // Mevcut Stripe customer yoksa oluştur
  if (!user.stripeCustomerId) {
    const customer = await stripe.customers.create({ email: userEmail, metadata: { userId } })
    user = await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    })
  }

  const session = await stripe.checkout.sessions.create({
    customer: user.stripeCustomerId!,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings?upgrade=success`,
    cancel_url: `${appUrl}/settings?upgrade=cancelled`,
    metadata: { userId },
  })

  if (!session.url) throw new Error('Checkout session URL oluşturulamadı')
  return session.url
}

export async function createBillingPortalSession(userId: string): Promise<string> {
  const stripe = getStripe()
  const appUrl = process.env['APP_URL'] ?? 'http://localhost:5173'

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.stripeCustomerId) throw new Error('Stripe müşterisi bulunamadı')

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/settings`,
  })

  return session.url
}

export async function handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
  const stripe = getStripe()
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET']
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set')

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch {
    throw new Error('Stripe webhook imzası geçersiz')
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.['userId']
      const subscriptionId = session.subscription as string
      if (!userId || !subscriptionId) break

      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      const priceId = sub.items.data[0]?.price.id ?? ''
      const periodEnd = new Date((sub.current_period_end) * 1000)

      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { plan: 'PRO' } }),
        prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            status: 'ACTIVE',
            currentPeriodEnd: periodEnd,
          },
          update: {
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            status: 'ACTIVE',
            currentPeriodEnd: periodEnd,
          },
        }),
      ])
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.['userId'] ?? await resolveUserIdFromCustomer(sub.customer as string)
      if (!userId) break

      const status = mapStripeStatus(sub.status)
      const periodEnd = new Date(sub.current_period_end * 1000)
      const plan = status === 'ACTIVE' ? 'PRO' : 'FREE'

      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { plan } }),
        prisma.subscription.update({
          where: { stripeSubscriptionId: sub.id },
          data: { status, currentPeriodEnd: periodEnd },
        }),
      ])
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const userId = await resolveUserIdFromCustomer(sub.customer as string)
      if (!userId) break

      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { plan: 'FREE' } }),
        prisma.subscription.update({
          where: { stripeSubscriptionId: sub.id },
          data: { status: 'CANCELED' },
        }),
      ])
      break
    }
  }
}

async function resolveUserIdFromCustomer(customerId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } })
  return user?.id ?? null
}

function mapStripeStatus(status: Stripe.Subscription.Status): 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'INCOMPLETE' {
  switch (status) {
    case 'active': return 'ACTIVE'
    case 'canceled': return 'CANCELED'
    case 'past_due': return 'PAST_DUE'
    default: return 'INCOMPLETE'
  }
}
