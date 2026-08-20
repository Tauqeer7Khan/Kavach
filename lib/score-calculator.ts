// lib/score-calculator.ts
// KAVACH — Standalone Security Score & Grade Calculator

import type { VulnerabilitySeverity } from '@/types'

export interface SecurityScoreResult {
  score: number
  grade: string
}

export function calculateSecurityScoreFromCounts(counts: {
  critical: number
  high: number
  medium: number
  low: number
  info?: number
}): SecurityScoreResult {
  let score = 100

  score -= counts.critical * 25
  score -= counts.high * 15
  score -= counts.medium * 8
  score -= counts.low * 3

  score = Math.max(0, Math.min(100, score))

  let grade = 'F'
  if (score >= 95) grade = 'A+'
  else if (score >= 85) grade = 'A'
  else if (score >= 70) grade = 'B'
  else if (score >= 50) grade = 'C'
  else if (score >= 35) grade = 'D'
  else grade = 'F'

  return { score, grade }
}

export function calculateScoreFromVulnerabilities(
  vulnerabilities: Array<{ severity: VulnerabilitySeverity | string | null; is_false_positive?: boolean; is_fixed?: boolean }>
): SecurityScoreResult {
  // Exclude ignored (false positive) vulnerabilities
  const activeVulns = vulnerabilities.filter(v => !v.is_false_positive)

  const counts = {
    critical: activeVulns.filter(v => v.severity === 'CRITICAL').length,
    high:     activeVulns.filter(v => v.severity === 'HIGH').length,
    medium:   activeVulns.filter(v => v.severity === 'MEDIUM').length,
    low:      activeVulns.filter(v => v.severity === 'LOW').length,
    info:     activeVulns.filter(v => v.severity === 'INFO').length,
  }

  return calculateSecurityScoreFromCounts(counts)
}
