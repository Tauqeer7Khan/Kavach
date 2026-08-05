import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const PLAN_CONFIG = {
  enterprise: {
    plan: 'enterprise' as const,
    scans_limit: 999999,
    message: 'Welcome to Enterprise!',
  },
};

export async function POST(request: Request) {
  // 1. Verify user is authenticated
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse and normalize the coupon code
  let code: string;
  try {
    const body = await request.json();
    code = (body.code ?? '').trim().toUpperCase();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ success: false, error: 'Coupon code is required' }, { status: 400 });
  }

  // 3. Read valid codes from env (server-side only — never exposed to client)
  const COUPON_ENTERPRISE = (process.env.COUPON_ENTERPRISE ?? '').toUpperCase();

  if (!COUPON_ENTERPRISE) {
    console.error('❌ Coupon env var not configured (COUPON_ENTERPRISE)');
    return NextResponse.json({ success: false, error: 'Coupon system not configured' }, { status: 500 });
  }

  // 4. Determine which plan the code unlocks (never log the code itself)
  let planConfig: typeof PLAN_CONFIG['enterprise'] | null = null;

  if (code === COUPON_ENTERPRISE) {
    planConfig = PLAN_CONFIG.enterprise;
  }

  if (!planConfig) {
    // Don't reveal which codes exist — generic error only
    return NextResponse.json({ success: false, error: 'Invalid coupon code' }, { status: 400 });
  }

  // 5. Update user plan via admin client (bypasses RLS)
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      plan: planConfig.plan,
      scans_limit: planConfig.scans_limit,
    })
    .eq('id', user.id);

  if (updateError) {
    console.error('❌ Failed to update user plan:', updateError.message);
    return NextResponse.json({ success: false, error: 'Failed to apply coupon. Please try again.' }, { status: 500 });
  }

  // 6. Log redemption (user info only — never log the code)
  console.log(`🎉 Coupon redeemed: user=${user.email} → plan=${planConfig.plan} limit=${planConfig.scans_limit}`);

  return NextResponse.json({
    success: true,
    plan: planConfig.plan,
    newLimit: planConfig.scans_limit,
    message: planConfig.message,
  });
}
