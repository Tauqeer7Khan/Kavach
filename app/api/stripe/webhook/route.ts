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
      const userId =
        session.metadata?.userId || session.client_reference_id

      if (!userId) {
        console.error('No userId in checkout session metadata')
        break
      }

      // Get subscription to find the price ID
      if (!session.subscription) {
        console.error('No subscription in checkout session')
        break
      }

      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      )
      const priceId = subscription.items.data[0]?.price?.id

      if (!priceId) {
        console.error('No price ID in subscription')
        break
      }

      const plan = getPlanFromPriceId(priceId)
      const scansLimit = PLAN_LIMITS[plan] || 15

      // Update user plan in database
      const { error } = await supabase
        .from('users')
        .update({
          plan,
          scans_limit: scansLimit,
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

    // ── SUBSCRIPTION UPDATED (plan change) ───────────
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.userId

      if (!userId) break

      const priceId = subscription.items.data[0]?.price?.id
      if (!priceId) break

      const plan = getPlanFromPriceId(priceId)
      const scansLimit = PLAN_LIMITS[plan] || 15

      await supabase
        .from('users')
        .update({
          plan,
          scans_limit: scansLimit,
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
        const customerId = subscription.customer as string
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
                updated_at: new Date().toISOString(),
              })
              .eq('email', customer.email)

            console.log(`⬇️ User ${customer.email} downgraded to free`)
          }
        } catch (e) {
          console.error('Failed to downgrade user:', e)
        }
        break
      }

      await supabase
        .from('users')
        .update({
          plan: 'free',
          scans_limit: 15,
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
      // Future: send email notification here
      break
    }

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
