// app/api/scans/[id]/report/download/route.ts
// KAVACH — Download scan report in multiple formats
// Markdown: All tiers (Free basic, Pro/Enterprise detailed)
// JSON:     Pro + Enterprise
// SARIF:    Enterprise only

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateMarkdownReport } from '@/lib/markdown-report'
import { generateJsonReport } from '@/lib/json-report'
import { generateSarifReport } from '@/lib/sarif-report'
import type { UserPlan } from '@/types'

type Format = 'markdown' | 'json' | 'sarif'

const FORMAT_CONFIG: Record<Format, {
  contentType: string
  extension: string
  requiredTier: UserPlan
}> = {
  markdown: {
    contentType: 'text/markdown; charset=utf-8',
    extension:   'md',
    requiredTier: 'free',
  },
  json: {
    contentType: 'application/json; charset=utf-8',
    extension:   'json',
    requiredTier: 'pro',
  },
  sarif: {
    contentType: 'application/sarif+json; charset=utf-8',
    extension:   'sarif',
    requiredTier: 'enterprise',
  },
}

const TIER_LEVELS: Record<UserPlan, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
}

function isUpgradeRequired(userPlan: UserPlan, requiredTier: UserPlan): boolean {
  return TIER_LEVELS[userPlan] < TIER_LEVELS[requiredTier]
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scanId = params.id
    const supabase = await createClient()

    // ── Auth check ─────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Get user plan ──────────────────────────────────
    const { data: userData } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    const userPlan: UserPlan = (userData?.plan as UserPlan) ?? 'free'

    // ── Parse and validate format ──────────────────────
    const url = new URL(req.url)
    const formatParam = (url.searchParams.get('format') ?? 'markdown') as Format

    if (!(formatParam in FORMAT_CONFIG)) {
      return NextResponse.json(
        { error: `Invalid format. Supported: markdown, json, sarif` },
        { status: 400 }
      )
    }

    const config = FORMAT_CONFIG[formatParam]

    // ── Tier gate ──────────────────────────────────────
    if (isUpgradeRequired(userPlan, config.requiredTier)) {
      const tierName = config.requiredTier === 'enterprise' ? 'Enterprise' : 'Pro'
      return NextResponse.json(
        {
          error: `${formatParam.toUpperCase()} export requires ${tierName} plan`,
          upgradeRequired: true,
          requiredTier: config.requiredTier,
        },
        { status: 403 }
      )
    }

    // ── Fetch scan ─────────────────────────────────────
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select(`
        *,
        projects (
          name,
          repo_url
        )
      `)
      .eq('id', scanId)
      .eq('user_id', user.id)
      .single()

    if (scanError || !scan) {
      return NextResponse.json(
        { error: 'Scan not found or access denied' },
        { status: 404 }
      )
    }

    if (scan.status !== 'completed') {
      return NextResponse.json(
        { error: 'Scan is not complete yet. Please wait for it to finish.' },
        { status: 400 }
      )
    }

    // ── Fetch vulnerabilities ──────────────────────────
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('*')
      .eq('scan_id', scanId)
      .order('severity', { ascending: true })
      .order('file_path', { ascending: true })
      .order('line_number', { ascending: true })

    if (vulnError) {
      return NextResponse.json(
        { error: 'Failed to fetch vulnerabilities: ' + vulnError.message },
        { status: 500 }
      )
    }

    // ── V2.2 — Fetch latest completed auto-fix job (Pro+ only) ──
    // Confidence data lives in fixed_files JSONB. Only fetch for Pro/Enterprise.
    let autoFixData: {
      fixed_files: Array<{
        file_path: string
        confidence?: {
          overall: number
          band: string
          label: string
          recommendation: string
        }
        vulnerabilities_fixed?: string[]
        lines_changed?: number
        status?: string
      }>
      fixed_count: number
      total_vulns: number
      completed_at: string | null
    } | null = null

    if (userPlan === 'pro' || userPlan === 'enterprise') {
      const { data: fixJob } = await supabase
        .from('auto_fix_jobs')
        .select('fixed_files, fixed_count, total_vulns, completed_at')
        .eq('scan_id', scanId)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fixJob && Array.isArray(fixJob.fixed_files)) {
        autoFixData = {
          fixed_files: fixJob.fixed_files as NonNullable<typeof autoFixData>['fixed_files'],
          fixed_count: fixJob.fixed_count ?? 0,
          total_vulns: fixJob.total_vulns ?? 0,
          completed_at: fixJob.completed_at,
        }
      }
    }

    // ── Generate report in requested format ────────────
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ai-kavach.vercel.app'
    let reportContent: string

    switch (formatParam) {
      case 'markdown':
        reportContent = generateMarkdownReport({
          scan,
          vulnerabilities: vulnerabilities ?? [],
          userPlan,
          siteUrl,
          autoFixData,  // V2.2 — confidence data
        })
        break
      case 'json':
        reportContent = generateJsonReport({
          scan,
          vulnerabilities: vulnerabilities ?? [],
          userPlan,
          siteUrl,
          autoFixData,  // V2.2 — confidence data
        })
        break
      case 'sarif':
        reportContent = generateSarifReport({
          scan,
          vulnerabilities: vulnerabilities ?? [],
          siteUrl,
          autoFixData,  // V2.2 — confidence data
        })
        break
    }

    // ── Build filename (IST-aware) ─────────────────────
    const shortId = scan.id.slice(0, 8)
    const now = new Date()
    const istDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
    const filename = `KAVACH-report-${shortId}-${istDate}.${config.extension}`

    // ── Return as downloadable file ────────────────────
    return new NextResponse(reportContent, {
      status: 200,
      headers: {
        'Content-Type': config.contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })

  } catch (err) {
    console.error('Report download error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
