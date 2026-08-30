import Stripe from 'stripe'

const secretKey = process.env.STRIPE_SECRET_KEY

if (!secretKey) {
  console.warn('⚠️ STRIPE_SECRET_KEY not set — Stripe features disabled')
}

export const stripe = new Stripe(secretKey || 'sk_test_placeholder', {
  typescript: true,
})

export const STRIPE_PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || ''
export const STRIPE_ENTERPRISE_PRICE_ID = process.env.STRIPE_ENTERPRISE_PRICE_ID || ''

export const PLAN_LIMITS: Record<string, number> = {
  free: 15,
  pro: 100,
  enterprise: 99999,
}

export function getPlanFromPriceId(priceId: string): string {
  if (priceId === STRIPE_PRO_PRICE_ID) return 'pro'
  if (priceId === STRIPE_ENTERPRISE_PRICE_ID) return 'enterprise'
  return 'free'
}
