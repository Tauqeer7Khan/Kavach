import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import {
  stripe,
  STRIPE_PRO_PRICE_ID,
  STRIPE_ENTERPRISE_PRICE_ID,
} from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // 1. Auth check
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse body
    const { priceId } = await request.json()

    // 3. Validate price ID (prevent tampering)
    const validPrices = [STRIPE_PRO_PRICE_ID, STRIPE_ENTERPRISE_PRICE_ID]
    if (!priceId || !validPrices.includes(priceId)) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      )
    }

    // 4. Check if user already has an active subscription
    //    If yes, redirect to billing portal instead
    const { data: profile } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (profile?.plan === 'pro' && priceId === STRIPE_PRO_PRICE_ID) {
      return NextResponse.json(
        { error: 'Already subscribed to Pro', redirect: '/settings' },
        { status: 409 }
      )
    }

    if (profile?.plan === 'enterprise' && priceId === STRIPE_ENTERPRISE_PRICE_ID) {
      return NextResponse.json(
        { error: 'Already subscribed to Enterprise', redirect: '/settings' },
        { status: 409 }
      )
    }

    // 5. Create Stripe Checkout Session
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email || undefined,
      success_url: `${appUrl}/settings?payment=success`,
      cancel_url: `${appUrl}/settings?payment=canceled`,
      metadata: {
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error)
    const message =
      error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
