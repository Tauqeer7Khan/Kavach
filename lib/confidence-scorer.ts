// lib/confidence-scorer.ts
// KAVACH V2.2 — Fix Confidence Scoring Engine
// Calculates 0-100 confidence score for each AI-generated fix
// Based on 6 weighted factors

import type { ConfidenceScore, ConfidenceBand, ConfidenceFactors } from '../types'
import { CONFIDENCE_BANDS } from '../types'

// ─────────────────────────────────────────────────────────
// Weights (must sum to 1.0)
// ─────────────────────────────────────────────────────────

const WEIGHTS = {
  vuln_type_match:     0.25,
  fix_size:            0.15,
  detection_consensus: 0.15,
  code_complexity:     0.15,
  test_coverage_hint:  0.10,
  ai_self_rating:      0.20,
} as const

// ─────────────────────────────────────────────────────────
// FACTOR 1: Vulnerability Type Match
// Well-known patterns have well-established fixes
// ─────────────────────────────────────────────────────────

const VULN_TYPE_SCORES: Record<string, number> = {
  // Hardcoded secrets → env vars (near-perfect)
  'hardcoded secret':          98,
  'hardcoded api key':         98,
  'hardcoded stripe':          98,
  'detected stripe api key':   98,
  'hardcoded generic-api-key': 95,
  'hardcoded password':        95,
  'hardcoded jwt':             95,

  // SQL injection → parameterized queries (very well-known)
  'sql injection':                     95,
  'sql injection (tainted input)':     95,
  'sqlalchemy execute raw query':      92,
  'string concatenation in query':     92,

  // Weak crypto → strong hash (mechanical fix)
  'weak cryptography':      90,
  'weak cryptography - md5': 90,
  'insecure hash algorithm md5': 88,
  'md5 used as password':   88,

  // eval() → JSON.parse or safe alternative
  'code injection via eval()': 85,
  'eval detected':             85,

  // Path traversal → path.basename() / path.join()
  'path traversal':            82,
  'path-join-resolve-traversal': 82,

  // Command injection → subprocess with args array
  'command injection':      82,
  'dangerous system call':  80,
  'os system injection':    80,
  'spawn-shell-true':       80,

  // XSS → escaping/sanitization
  'xss':                    75,
  'cross-site scripting':   75,
  'direct response write':  70,

  // SSRF → allowlist checks
  'ssrf':                          65,
  'server-side request forgery':   65,

  // Config-level warnings
  'debug enabled':                55,
  'avoid app run with bad host':  55,
  'express check csurf middleware usage': 50,

  // Unknown/custom
  'unknown':               40,
}

function scoreVulnTypeMatch(vulnNames: string[]): number {
  if (vulnNames.length === 0) return 40

  const scores = vulnNames.map(name => {
    const key = name.toLowerCase().trim()

    // Exact match first
    if (VULN_TYPE_SCORES[key] !== undefined) {
      return VULN_TYPE_SCORES[key]
    }

    // Partial match — find the best matching key
    for (const [pattern, score] of Object.entries(VULN_TYPE_SCORES)) {
      if (key.includes(pattern) || pattern.includes(key)) {
        return score
      }
    }

    return 45 // Default for unrecognized vulnerability type
  })

  // Average across all vulnerabilities in this file
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  return Math.round(avg)
}

// ─────────────────────────────────────────────────────────
// FACTOR 2: Fix Size
// Smaller edits are safer than big rewrites
// ─────────────────────────────────────────────────────────

function scoreFixSize(linesChanged: number, totalLines: number): number {
  if (linesChanged === 0) return 100

  // Percent of file changed
  const percent = totalLines > 0 ? (linesChanged / totalLines) * 100 : 100

  // Absolute lines changed thresholds
  if (linesChanged <= 3) return 95
  if (linesChanged <= 10) return 85
  if (linesChanged <= 20) return 70
  if (linesChanged <= 50) return 50

  // Also penalize if too much % of file changed
  if (percent > 50) return 20
  if (percent > 30) return 40

  return 30
}

// ─────────────────────────────────────────────────────────
// FACTOR 3: Detection Consensus
// Multiple engines agreeing = higher confidence
// ─────────────────────────────────────────────────────────

function scoreDetectionConsensus(
  detectionMethods: string[]
): number {
  const uniqueMethods = new Set(detectionMethods)
  const count = uniqueMethods.size

  // All 3 engines agree
  if (count >= 3) return 100

  // 2 engines agree
  if (count === 2) return 82

  // Only 1 engine — but which one matters
  if (count === 1) {
    const method = Array.from(uniqueMethods)[0]
    if (method === 'secret') return 90  // Gitleaks is unambiguous
    if (method === 'static') return 75  // Semgrep is well-tested
    if (method === 'ai')     return 60  // AI alone is least certain
  }

  return 50
}

// ─────────────────────────────────────────────────────────
// FACTOR 4: Code Complexity
// Simpler code is safer to modify
// ─────────────────────────────────────────────────────────

function scoreCodeComplexity(code: string): number {
  const lines = code.split('\n')
  const totalLines = lines.length
  const nonBlankLines = lines.filter(l => l.trim().length > 0).length

  let score = 50  // Base score

  // File size heuristics
  if (totalLines < 50)  score += 25
  else if (totalLines < 150) score += 15
  else if (totalLines < 300) score += 5
  else if (totalLines > 500) score -= 15
  else if (totalLines > 1000) score -= 30

  // Nesting depth (rough proxy: max indent)
  const maxIndent = lines
    .map(l => l.match(/^(\s*)/)?.[1].length ?? 0)
    .reduce((max, v) => Math.max(max, v), 0)

  if (maxIndent <= 4)  score += 15
  else if (maxIndent <= 8)  score += 5
  else if (maxIndent > 16) score -= 15

  // Async complexity (rough proxy: async/await/promise counts)
  const asyncCount = (code.match(/\basync\b|\bawait\b|\.then\(|\.catch\(/g) ?? []).length
  const complexityRatio = nonBlankLines > 0 ? asyncCount / nonBlankLines : 0

  if (complexityRatio > 0.15) score -= 15
  else if (complexityRatio > 0.05) score -= 5

  // Multiple return paths
  const returnCount = (code.match(/\breturn\b/g) ?? []).length
  if (returnCount > 20) score -= 10

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score))
}

// ─────────────────────────────────────────────────────────
// FACTOR 5: Test Coverage Hint
// Files with tests are safer to modify
// ─────────────────────────────────────────────────────────

function scoreTestCoverage(
  filePath: string,
  allFilePaths: string[]
): number {
  const fileName = filePath.split('/').pop() ?? ''
  const baseName = fileName.replace(/\.[^.]+$/, '') // Remove extension

  // Direct test file exists?
  const hasDirectTest = allFilePaths.some(p => {
    const pName = p.split('/').pop() ?? ''
    return (
      pName === `${baseName}.test.js` ||
      pName === `${baseName}.test.ts` ||
      pName === `${baseName}.spec.js` ||
      pName === `${baseName}.spec.ts` ||
      pName === `${baseName}.test.py` ||
      pName === `test_${baseName}.py` ||
      pName === `${baseName}_test.py` ||
      pName === `${baseName}.test.jsx` ||
      pName === `${baseName}.test.tsx`
    )
  })

  if (hasDirectTest) return 90

  // Project has test directory?
  const hasTestDir = allFilePaths.some(p =>
    p.includes('/test/') ||
    p.includes('/tests/') ||
    p.includes('/__tests__/') ||
    p.includes('/spec/')
  )

  if (hasTestDir) return 60

  return 40
}

// ─────────────────────────────────────────────────────────
// FACTOR 6: AI Self-Rating
// AI rates its own confidence (default 70 if not provided)
// ─────────────────────────────────────────────────────────

function normalizeAiSelfRating(rating: number | null | undefined): number {
  if (typeof rating !== 'number' || isNaN(rating)) return 70
  return Math.max(0, Math.min(100, Math.round(rating)))
}

// ─────────────────────────────────────────────────────────
// Determine confidence band from overall score
// ─────────────────────────────────────────────────────────

function getBand(overall: number): ConfidenceBand {
  if (overall >= 90) return 'high'
  if (overall >= 70) return 'medium'
  if (overall >= 50) return 'low'
  return 'very_low'
}

// ─────────────────────────────────────────────────────────
// MAIN — Calculate confidence score for a fix
// ─────────────────────────────────────────────────────────

export interface CalculateConfidenceInput {
  vulnNames: string[]                    // Names of all vulns in this file
  detectionMethods: string[]             // static/ai/secret/dependency
  originalCode: string                   // Original file content
  fixedCode: string                      // AI-fixed file content
  linesChanged: number                   // From auto-fixer's LCS diff
  allFilePaths?: string[]                // All file paths in scan (for test detection)
  aiSelfRating?: number | null           // AI's self-assessment 0-100
}

export function calculateConfidence(input: CalculateConfidenceInput): ConfidenceScore {
  const factors: ConfidenceFactors = {
    vuln_type_match:     scoreVulnTypeMatch(input.vulnNames),
    fix_size:            scoreFixSize(input.linesChanged, input.originalCode.split('\n').length),
    detection_consensus: scoreDetectionConsensus(input.detectionMethods),
    code_complexity:     scoreCodeComplexity(input.originalCode),
    test_coverage_hint:  scoreTestCoverage(
      input.originalCode.slice(0, 100), // Fallback for file path
      input.allFilePaths ?? []
    ),
    ai_self_rating:      normalizeAiSelfRating(input.aiSelfRating),
  }

  // Weighted average
  const overall = Math.round(
    factors.vuln_type_match     * WEIGHTS.vuln_type_match +
    factors.fix_size            * WEIGHTS.fix_size +
    factors.detection_consensus * WEIGHTS.detection_consensus +
    factors.code_complexity     * WEIGHTS.code_complexity +
    factors.test_coverage_hint  * WEIGHTS.test_coverage_hint +
    factors.ai_self_rating      * WEIGHTS.ai_self_rating
  )

  const band = getBand(overall)
  const bandConfig = CONFIDENCE_BANDS[band]

  return {
    overall: Math.max(0, Math.min(100, overall)),
    band,
    label: bandConfig.label,
    recommendation: bandConfig.recommendation,
    factors,
  }
}

// ─────────────────────────────────────────────────────────
// Version with file path (used by worker after fix completes)
// ─────────────────────────────────────────────────────────

export function calculateConfidenceForFile(input: CalculateConfidenceInput & {
  filePath: string
}): ConfidenceScore {
  // Reuse logic, but pass file path to test coverage function
  const factors: ConfidenceFactors = {
    vuln_type_match:     scoreVulnTypeMatch(input.vulnNames),
    fix_size:            scoreFixSize(input.linesChanged, input.originalCode.split('\n').length),
    detection_consensus: scoreDetectionConsensus(input.detectionMethods),
    code_complexity:     scoreCodeComplexity(input.originalCode),
    test_coverage_hint:  scoreTestCoverage(input.filePath, input.allFilePaths ?? []),
    ai_self_rating:      normalizeAiSelfRating(input.aiSelfRating),
  }

  const overall = Math.round(
    factors.vuln_type_match     * WEIGHTS.vuln_type_match +
    factors.fix_size            * WEIGHTS.fix_size +
    factors.detection_consensus * WEIGHTS.detection_consensus +
    factors.code_complexity     * WEIGHTS.code_complexity +
    factors.test_coverage_hint  * WEIGHTS.test_coverage_hint +
    factors.ai_self_rating      * WEIGHTS.ai_self_rating
  )

  const band = getBand(overall)
  const bandConfig = CONFIDENCE_BANDS[band]

  return {
    overall: Math.max(0, Math.min(100, overall)),
    band,
    label: bandConfig.label,
    recommendation: bandConfig.recommendation,
    factors,
  }
}
