// app/api/scans/[id]/vulnerabilities/[vulnId]/ignore/route.ts
// KAVACH V2.3 — One-Click Ignore API Route (Pro & Enterprise only)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { calculateSecurityScoreFromCounts } from '@/lib/score-calculator'
import type { UserPlan } from '@/types'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; vulnId: string } }
) {
  try {
    const scanId = params.id
    const vulnId = params.vulnId

    const supabase = await createClient()

    // ── 1. Auth check ──────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 2. Tier enforcement (Pro + Enterprise only) ────
    const { data: userData } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    const userPlan: UserPlan = (userData?.plan as UserPlan) ?? 'free'

    if (userPlan === 'free') {
      return NextResponse.json(
        {
          error: 'Pro or Enterprise plan required',
          upgradeRequired: true,
          message: 'One-Click Ignore (Mark as Accepted Risk) is available on Pro & Enterprise plans.',
        },
        { status: 403 }
      )
    }

    // ── 3. Parse request body ──────────────────────────
    const body = await req.json().catch(() => ({}))
    const action = body.action === 'unignore' ? 'unignore' : 'ignore'
    const reason = body.reason?.trim() || 'Accepted Risk'

    // ── 4. Verify scan ownership ──────────────────────
    const { data: scan, error: scanErr } = await supabase
      .from('scans')
      .select('id, user_id')
      .eq('id', scanId)
      .eq('user_id', user.id)
      .single()

    if (scanErr || !scan) {
      return NextResponse.json(
        { error: 'Scan not found or access denied' },
        { status: 404 }
      )
    }

    // ── 5. Update vulnerability false-positive status ──
    const isFalsePositive = action === 'ignore'
    const falsePositiveReason = action === 'ignore' ? reason : null

    const { data: updatedVuln, error: vulnErr } = await supabase
      .from('vulnerabilities')
      .update({
        is_false_positive: isFalsePositive,
        false_positive_reason: falsePositiveReason,
      })
      .eq('id', vulnId)
      .eq('scan_id', scanId)
      .select()
      .single()

    if (vulnErr || !updatedVuln) {
      return NextResponse.json(
        { error: 'Vulnerability not found: ' + vulnErr?.message },
        { status: 404 }
      )
    }

    // ── 6. Recalculate Scan Security Score ──────────────
    const { data: allVulns, error: allVulnsErr } = await supabase
      .from('vulnerabilities')
      .select('severity, is_false_positive')
      .eq('scan_id', scanId)

    if (allVulnsErr) {
      return NextResponse.json(
        { error: 'Failed to fetch vulnerabilities for score calculation' },
        { status: 500 }
      )
    }

    // Only active (non-ignored) vulnerabilities impact the score
    const activeVulns = (allVulns ?? []).filter(v => !v.is_false_positive)

    const counts = {
      critical: activeVulns.filter(v => v.severity === 'CRITICAL').length,
      high:     activeVulns.filter(v => v.severity === 'HIGH').length,
      medium:   activeVulns.filter(v => v.severity === 'MEDIUM').length,
      low:      activeVulns.filter(v => v.severity === 'LOW').length,
      info:     activeVulns.filter(v => v.severity === 'INFO').length,
    }

    const { score: newScore, grade: newGrade } = calculateSecurityScoreFromCounts(counts)

    // Update scan row with recalculated score & active counts
    await supabase
      .from('scans')
      .update({
        security_score: newScore,
        grade: newGrade,
        total_vulnerabilities: activeVulns.length,
        critical_count: counts.critical,
        high_count: counts.high,
        medium_count: counts.medium,
        low_count: counts.low,
        info_count: counts.info,
      })
      .eq('id', scanId)

    return NextResponse.json({
      success: true,
      vulnId: updatedVuln.id,
      isIgnored: isFalsePositive,
      reason: falsePositiveReason,
      newScore,
      newGrade,
      activeVulnsCount: activeVulns.length,
    })

  } catch (err) {
    console.error('Ignore vulnerability error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
