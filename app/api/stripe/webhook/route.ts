import { NextResponse } from 'next/server'
import { stripe, getPlanFromPriceId, PLAN_LIMITS } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'

// Use service role key for webhook (no user session available)
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  // 1. Verify webhook signature
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // 2. Handle events
  switch (event.type) {
    // ── PAYMENT SUCCESS ──────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session

      // Get userId from metadata
      const userId = session.metadata?.userId || session.client_reference_id

      if (!userId) {
        console.error('No userId in checkout session metadata')
        break
      }

      // Get subscription to find the price ID
      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id

      if (!subscriptionId) {
        console.error('No subscription in checkout session')
        break
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const priceId = subscription.items.data[0]?.price?.id

      if (!priceId) {
        console.error('No price ID in subscription')
        break
      }

      const plan = getPlanFromPriceId(priceId)
      const scansLimit = PLAN_LIMITS[plan] || 15

      const subWithPeriod = subscription as unknown as { current_period_end?: number }
      const rawPeriodEnd = subWithPeriod.current_period_end
      const periodEndIso = rawPeriodEnd
        ? new Date(rawPeriodEnd * 1000).toISOString()
        : null

      const customerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id || null

      // Update user plan and Stripe details in database
      const { error } = await supabase
        .from('users')
        .update({
          plan,
          scans_limit: scansLimit,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          subscription_period_end: periodEndIso,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) {
        console.error('Failed to update user plan:', error)
      } else {
        console.log(`✅ User ${userId} upgraded to ${plan}`)
      }

      break
    }

    // ── SUBSCRIPTION UPDATED (plan change/status change) ───────────
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.userId

      if (!userId) break

      const priceId = subscription.items.data[0]?.price?.id
      if (!priceId) break

      const plan = getPlanFromPriceId(priceId)
      const scansLimit = PLAN_LIMITS[plan] || 15

      const subWithPeriod = subscription as unknown as { current_period_end?: number }
      const rawPeriodEnd = subWithPeriod.current_period_end
      const periodEndIso = rawPeriodEnd
        ? new Date(rawPeriodEnd * 1000).toISOString()
        : null

      await supabase
        .from('users')
        .update({
          plan,
          scans_limit: scansLimit,
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status,
          subscription_period_end: periodEndIso,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      console.log(`🔄 User ${userId} subscription updated to ${plan}`)
      break
    }

    // ── SUBSCRIPTION CANCELLED ───────────────────────
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.userId

      if (!userId) {
        // Fallback: find user by customer email
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id

        if (customerId) {
          try {
            const customer = (await stripe.customers.retrieve(
              customerId
            )) as Stripe.Customer

            if (customer.email) {
              await supabase
                .from('users')
                .update({
                  plan: 'free',
                  scans_limit: 15,
                  stripe_subscription_id: null,
                  subscription_status: 'canceled',
                  subscription_period_end: null,
                  updated_at: new Date().toISOString(),
                })
                .eq('email', customer.email)

              console.log(`⬇️ User ${customer.email} downgraded to free`)
            }
          } catch (e) {
            console.error('Failed to downgrade user:', e)
          }
        }
        break
      }

      await supabase
        .from('users')
        .update({
          plan: 'free',
          scans_limit: 15,
          stripe_subscription_id: null,
          subscription_status: 'canceled',
          subscription_period_end: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      console.log(`⬇️ User ${userId} downgraded to free`)
      break
    }

    // ── PAYMENT FAILED ───────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      console.warn(
        `⚠️ Payment failed for customer ${invoice.customer}`
      )
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
