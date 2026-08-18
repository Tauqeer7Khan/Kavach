// lib/sarif-report.ts
// KAVACH — SARIF v2.1.0 Report Generator
// Industry-standard format compatible with:
// - GitHub Advanced Security (Code Scanning tab)
// - VS Code SARIF Viewer
// - Azure DevOps, GitLab, JetBrains, SonarQube
// - All major security compliance tools
// Spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/os/sarif-v2.1.0-os.html

import type { Scan, Vulnerability, VulnerabilitySeverity } from '@/types'

export interface SarifReportOptions {
  scan: Scan & { projects?: { name?: string | null; repo_url?: string | null } | null }
  vulnerabilities: Vulnerability[]
  siteUrl?: string
}

// Strip /tmp/kavach-scans/{scanId}/ prefix
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

// Map KAVACH severity → SARIF level
function severityToLevel(severity: VulnerabilitySeverity | null): 'error' | 'warning' | 'note' {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'error'
  if (severity === 'MEDIUM') return 'warning'
  return 'note'
}

// Map severity → SARIF security-severity score (0.0-10.0)
function severityToScore(severity: VulnerabilitySeverity | null): string {
  const scores: Record<string, string> = {
    CRITICAL: '9.5',
    HIGH:     '7.5',
    MEDIUM:   '5.5',
    LOW:      '3.5',
    INFO:     '1.5',
  }
  return scores[severity ?? 'INFO'] ?? '1.5'
}

export function generateSarifReport(opts: SarifReportOptions): string {
  const { scan, vulnerabilities, siteUrl = 'https://ai-kavach.vercel.app' } = opts

  // Build unique rules from vulnerabilities
  const rulesMap = new Map<string, Record<string, unknown>>()

  vulnerabilities.forEach(v => {
    const ruleId = v.vuln_code ?? v.name.toLowerCase().replace(/\s+/g, '-')
    if (rulesMap.has(ruleId)) return

    rulesMap.set(ruleId, {
      id: ruleId,
      name: v.name,
      shortDescription: {
        text: v.name,
      },
      fullDescription: {
        text: v.description ?? v.name,
      },
      help: {
        text: v.ai_fix_explanation ?? v.description ?? 'See KAVACH scan details for remediation guidance.',
        markdown: [
          `**${v.name}**`,
          '',
          v.description ?? '',
          v.ai_fix_explanation ? `\n**Fix:** ${v.ai_fix_explanation}` : '',
          v.owasp_id ? `\n**OWASP:** ${v.owasp_id} — ${v.owasp_category ?? ''}` : '',
          v.cwe_id ? `\n**CWE:** ${v.cwe_id}` : '',
        ].filter(Boolean).join('\n'),
      },
      properties: {
        'security-severity': severityToScore(v.severity),
        tags: [
          'security',
          v.owasp_id ?? 'OWASP',
          v.cwe_id ?? 'CWE',
          v.detection_method ?? 'static',
        ].filter(Boolean),
      },
      defaultConfiguration: {
        level: severityToLevel(v.severity),
      },
    })
  })

  // Build SARIF results (one per vulnerability)
  const results = vulnerabilities.map(v => {
    const ruleId = v.vuln_code ?? v.name.toLowerCase().replace(/\s+/g, '-')
    const filePath = cleanFilePath(v.file_path)

    return {
      ruleId,
      level: severityToLevel(v.severity),
      message: {
        text: v.ai_explanation ?? v.description ?? v.name,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: filePath,
              uriBaseId: '%SRCROOT%',
            },
            region: {
              startLine: v.line_number ?? 1,
              endLine: v.line_end ?? v.line_number ?? 1,
              snippet: v.vulnerable_code ? {
                text: v.vulnerable_code,
              } : undefined,
            },
          },
        },
      ],
      fixes: v.fixed_code ? [
        {
          description: {
            text: v.ai_fix_explanation ?? 'KAVACH suggested fix',
          },
          artifactChanges: [
            {
              artifactLocation: {
                uri: filePath,
                uriBaseId: '%SRCROOT%',
              },
              replacements: [
                {
                  deletedRegion: {
                    startLine: v.line_number ?? 1,
                    endLine: v.line_end ?? v.line_number ?? 1,
                  },
                  insertedContent: {
                    text: v.fixed_code,
                  },
                },
              ],
            },
          ],
        },
      ] : undefined,
      properties: {
        'security-severity': severityToScore(v.severity),
        owasp: v.owasp_id,
        cwe: v.cwe_id,
        detection_method: v.detection_method,
      },
    }
  })

  // Build the full SARIF report
  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'KAVACH',
            fullName: 'KAVACH AI Security Scanner',
            version: '2.1',
            informationUri: siteUrl,
            organization: 'KAVACH',
            rules: Array.from(rulesMap.values()),
            properties: {
              scan_id: scan.id,
              analysis_engine: scan.analysis_engine,
              llm_model: scan.llm_model,
            },
          },
        },
        invocations: [
          {
            executionSuccessful: scan.status === 'completed',
            startTimeUtc: scan.started_at ?? scan.created_at,
            endTimeUtc: scan.completed_at ?? new Date().toISOString(),
          },
        ],
        results,
        properties: {
          project_name: scan.projects?.name ?? null,
          repository_url: scan.projects?.repo_url ?? null,
          security_score: scan.security_score,
          grade: scan.grade,
          total_files_scanned: scan.files_scanned,
          total_lines_scanned: scan.lines_scanned,
        },
      },
    ],
  }

  return JSON.stringify(sarif, null, 2)
}
