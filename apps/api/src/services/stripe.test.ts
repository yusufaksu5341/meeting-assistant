import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('stripe', () => {
  const mockStripe = {
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
    subscriptions: { retrieve: vi.fn() },
    webhooks: { constructEvent: vi.fn() },
  }
  return { default: vi.fn(() => mockStripe) }
})

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import Stripe from 'stripe'
import { prisma } from '../lib/prisma.js'
import { createCheckoutSession, createBillingPortalSession } from './stripe.js'

const mockStripeInstance = new (Stripe as unknown as new () => typeof Stripe.prototype)()
const mockPrisma = vi.mocked(prisma)

describe('createCheckoutSession', () => {
  beforeEach(() => {
    process.env['STRIPE_SECRET_KEY'] = 'sk_test_xxx'
    process.env['STRIPE_PRO_PRICE_ID'] = 'price_xxx'

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'test@example.com',
      stripeCustomerId: 'cus_existing',
      name: null,
      slackToken: null,
      notionToken: null,
      plan: 'FREE',
      createdAt: new Date(),
    })

    vi.mocked(mockStripeInstance.checkout.sessions.create).mockResolvedValue({
      url: 'https://checkout.stripe.com/pay/cs_test',
    } as never)
  })

  afterEach(() => {
    delete process.env['STRIPE_SECRET_KEY']
    delete process.env['STRIPE_PRO_PRICE_ID']
    vi.clearAllMocks()
  })

  it('mevcut müşteri için checkout session URL döner', async () => {
    const url = await createCheckoutSession('user_1', 'test@example.com')
    expect(url).toBe('https://checkout.stripe.com/pay/cs_test')
    expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledOnce()
  })

  it('STRIPE_SECRET_KEY yoksa hata fırlatır', async () => {
    delete process.env['STRIPE_SECRET_KEY']
    await expect(createCheckoutSession('user_1', 'test@example.com')).rejects.toThrow('STRIPE_SECRET_KEY')
  })

  it('STRIPE_PRO_PRICE_ID yoksa hata fırlatır', async () => {
    delete process.env['STRIPE_PRO_PRICE_ID']
    await expect(createCheckoutSession('user_1', 'test@example.com')).rejects.toThrow('STRIPE_PRO_PRICE_ID')
  })
})

describe('createBillingPortalSession', () => {
  beforeEach(() => {
    process.env['STRIPE_SECRET_KEY'] = 'sk_test_xxx'

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'test@example.com',
      stripeCustomerId: 'cus_existing',
      name: null,
      slackToken: null,
      notionToken: null,
      plan: 'PRO',
      createdAt: new Date(),
    })

    vi.mocked(mockStripeInstance.billingPortal.sessions.create).mockResolvedValue({
      url: 'https://billing.stripe.com/session/xxx',
    } as never)
  })

  afterEach(() => {
    delete process.env['STRIPE_SECRET_KEY']
    vi.clearAllMocks()
  })

  it('portal URL döner', async () => {
    const url = await createBillingPortalSession('user_1')
    expect(url).toBe('https://billing.stripe.com/session/xxx')
  })

  it('stripeCustomerId yoksa hata fırlatır', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user_1',
      email: 'test@example.com',
      stripeCustomerId: null,
      name: null,
      slackToken: null,
      notionToken: null,
      plan: 'FREE',
      createdAt: new Date(),
    })
    await expect(createBillingPortalSession('user_1')).rejects.toThrow('Stripe müşterisi bulunamadı')
  })
})
