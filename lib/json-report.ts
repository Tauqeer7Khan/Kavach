// lib/json-report.ts
// KAVACH — JSON Report Generator
// Machine-readable scan results for programmatic use

import type { Scan, Vulnerability, UserPlan } from '@/types'

export interface JsonReportOptions {
  scan: Scan & { projects?: { name?: string | null; repo_url?: string | null } | null }
  vulnerabilities: Vulnerability[]
  userPlan: UserPlan
  siteUrl?: string
  // V2.2 — Auto-fix confidence data (Pro+ only)
  autoFixData?: {
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
  } | null
}

// Strip /tmp/kavach-scans/{scanId}/ prefix from file paths
function cleanFilePath(filePath: string | null): string {
  if (!filePath) return ''
  let clean = filePath
  if (clean.startsWith('/tmp/kavach-scans/')) {
    const parts = clean.split('/')
    if (parts.length > 4) {
      clean = parts.slice(4).join('/')
    }
  }
  clean = clean.replace(/^\/+/, '')
  return clean
}

export function generateJsonReport(opts: JsonReportOptions): string {
  const { scan, vulnerabilities, userPlan, siteUrl = 'https://ai-kavach.vercel.app', autoFixData } = opts

  // V2.2 — Build auto-fix summary (Pro+ only)
  const autoFixSection = (() => {
    if (!autoFixData || autoFixData.fixed_files.length === 0) return null

    const successfulFixes = autoFixData.fixed_files.filter(f => f.status === 'fixed' && f.confidence)
    if (successfulFixes.length === 0) return null

    const avgConfidence = Math.round(
      successfulFixes.reduce((sum, f) => sum + (f.confidence?.overall ?? 0), 0) / successfulFixes.length
    )

    return {
      total_fixed: autoFixData.fixed_count,
      total_vulns: autoFixData.total_vulns,
      completed_at: autoFixData.completed_at,
      average_confidence: avgConfidence,
      files: successfulFixes.map(f => ({
        file_path: cleanFilePath(f.file_path),
        vulnerabilities_fixed_count: f.vulnerabilities_fixed?.length ?? 0,
        vulnerability_ids: f.vulnerabilities_fixed ?? [],
        lines_changed: f.lines_changed ?? 0,
        confidence: {
          score: f.confidence!.overall,
          band: f.confidence!.band,
          label: f.confidence!.label,
          recommendation: f.confidence!.recommendation,
        },
      })),
    }
  })()

  const report = {
    // ── Meta ────────────────────────────────────────
    schema_version: '1.0',
    generator: {
      name: 'KAVACH',
      version: '2.1',
      url: siteUrl,
      github: 'https://github.com/Tauqeer7Khan/Kavach',
    },
    generated_at: new Date().toISOString(),
    plan: userPlan,

    // ── Scan Info ───────────────────────────────────
    scan: {
      id: scan.id,
      short_id: scan.id.slice(0, 8),
      project_name: scan.projects?.name ?? null,
      repository_url: scan.projects?.repo_url ?? null,
      created_at: scan.created_at,
      completed_at: scan.completed_at,
      duration_seconds: scan.scan_duration_seconds,
      status: scan.status,
      files_scanned: scan.files_scanned,
      lines_scanned: scan.lines_scanned,
      languages_detected: scan.languages_detected,
      analysis_engine: scan.analysis_engine,
      llm_model: scan.llm_model,
    },

    // ── Score ───────────────────────────────────────
    security_score: {
      value: scan.security_score,
      grade: scan.grade,
      max: 100,
    },

    // ── Summary ─────────────────────────────────────
    summary: {
      total_vulnerabilities: scan.total_vulnerabilities,
      by_severity: {
        critical: scan.critical_count,
        high: scan.high_count,
        medium: scan.medium_count,
        low: scan.low_count,
        info: scan.info_count,
      },
    },

    // ── Vulnerabilities ─────────────────────────────
    vulnerabilities: vulnerabilities.map(v => ({
      id: v.id,
      code: v.vuln_code,
      name: v.name,
      description: v.description,
      severity: v.severity,
      owasp: {
        id: v.owasp_id,
        category: v.owasp_category,
      },
      cwe: v.cwe_id,
      location: {
        file: cleanFilePath(v.file_path),
        line_start: v.line_number,
        line_end: v.line_end,
      },
      code_snippets: {
        vulnerable: v.vulnerable_code,
        fixed: v.fixed_code,
      },
      explanation: {
        why_dangerous: v.ai_explanation,
        how_fix_works: v.ai_fix_explanation,
        why_ai_makes_mistake: v.why_ai_makes_this_mistake,
      },
      detection: {
        method: v.detection_method,
        tool: v.tool_name,
      },
      status: {
        is_fixed: v.is_fixed,
        is_false_positive: v.is_false_positive,
      },
    })),

    // ── V2.2 — Auto-fix results with confidence (Pro+ only) ──
    auto_fix: autoFixSection,
  }

  return JSON.stringify(report, null, 2)
}
