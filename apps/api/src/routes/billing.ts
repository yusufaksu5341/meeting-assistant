import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createCheckoutSession, createBillingPortalSession, handleStripeWebhook } from '../services/stripe.js'
import { prisma } from '../lib/prisma.js'

const userIdSchema = z.object({ userId: z.string().min(1) })

export async function billingRouter(fastify: FastifyInstance) {
  // Checkout session başlat
  fastify.post('/billing/checkout', async (request, reply) => {
    const parsed = userIdSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'userId gerekli' })
    }

    const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } })
    if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' })

    try {
      const url = await createCheckoutSession(user.id, user.email)
      return reply.send({ url })
    } catch (err) {
      fastify.log.error(err, 'Checkout session oluşturulamadı')
      return reply.status(502).send({ error: 'Ödeme başlatılamadı' })
    }
  })

  // Fatura yönetim portalı
  fastify.post('/billing/portal', async (request, reply) => {
    const parsed = userIdSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'userId gerekli' })
    }

    try {
      const url = await createBillingPortalSession(parsed.data.userId)
      return reply.send({ url })
    } catch (err) {
      fastify.log.error(err, 'Portal session oluşturulamadı')
      return reply.status(502).send({ error: 'Fatura portalı açılamadı' })
    }
  })

  // Mevcut plan bilgisi
  fastify.get('/billing/status', async (request, reply) => {
    const parsed = userIdSchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'userId gerekli' })
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { plan: true, subscription: true },
    })

    if (!user) return reply.status(404).send({ error: 'Kullanıcı bulunamadı' })

    return reply.send({
      plan: user.plan,
      subscription: user.subscription
        ? {
            status: user.subscription.status,
            currentPeriodEnd: user.subscription.currentPeriodEnd,
          }
        : null,
    })
  })

  // Stripe webhook — raw body gerektirir
  fastify.post('/billing/webhook', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const signature = request.headers['stripe-signature']
    if (!signature || typeof signature !== 'string') {
      return reply.status(400).send({ error: 'stripe-signature header eksik' })
    }

    try {
      const rawBody = (request.body as Record<string, unknown>)?.['__rawBody'] as Buffer | undefined
      if (!rawBody) return reply.status(400).send({ error: 'Ham body alınamadı' })
      await handleStripeWebhook(rawBody, signature)
      return reply.send({ received: true })
    } catch (err) {
      fastify.log.error(err, 'Stripe webhook işlenemedi')
      return reply.status(400).send({ error: (err as Error).message })
    }
  })
}
