// lib/prompt-generator.ts
// KAVACH V2 — Master Prompt Generator (Phase 1, Free Tier)
// Pure utility — no side effects, no imports from other KAVACH files.

// ─────────────────────────────────────────────────────────────────────────────
// Public Types
// ─────────────────────────────────────────────────────────────────────────────

export type IdeType = 'cursor' | 'copilot' | 'windsurf' | 'chatgpt' | 'other'

export interface VulnerabilityForPrompt {
  id: string
  type: string        // e.g. "SQL Injection"  (maps from Vulnerability.name)
  severity: string    // lowercase: "critical" | "high" | "medium" | "low"
  filePath: string    // e.g. "src/api/users.ts"
  lineNumber: number  // 0 = unknown
  vulnerableCode: string
  fixedCode: string
  explanation: string
  fixReasoning: string
  owaspId?: string    // e.g. "A03:2021"
  language?: string   // e.g. "typescript"
}

export interface ScanReportForPrompt {
  scanId: string
  projectName?: string
  vulnerabilities: VulnerabilityForPrompt[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Language detector from file extension
// ─────────────────────────────────────────────────────────────────────────────

export function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    php: 'php',
    cs: 'csharp',
    cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
    c: 'c',
    swift: 'swift',
    kt: 'kotlin',
    sh: 'bash',
    yml: 'yaml', yaml: 'yaml',
    json: 'json',
    sql: 'sql',
  }
  return map[ext] ?? 'javascript'
}

// ─────────────────────────────────────────────────────────────────────────────
// IDE step-by-step instructions shown in the modal UI
// ─────────────────────────────────────────────────────────────────────────────

export const IDE_INSTRUCTIONS: Record<IdeType, string[]> = {
  cursor: [
    'Open your project folder in Cursor',
    'Press Cmd+L (Mac) or Ctrl+L (Windows) to open the AI chat',
    'Paste the prompt into the chat',
    'Cursor will read your codebase and suggest fixes',
    'Review each suggested change before accepting',
  ],
  copilot: [
    'Open your project in VS Code with GitHub Copilot installed',
    'Press Ctrl+Shift+I to open Copilot Chat',
    'Paste the prompt into the chat panel',
    'Review each suggestion carefully before accepting',
    'Only accept changes to the security-related lines',
  ],
  windsurf: [
    'Open your project in Windsurf',
    'Open the AI Chat panel (not Cascade mode)',
    'Paste the prompt into the chat',
    'Review changes in the diff viewer before accepting',
    'Accept only the vulnerability fixes shown',
  ],
  chatgpt: [
    'Open a new chat in ChatGPT or Claude',
    'Paste the entire prompt as your first message',
    'Wait for the AI to explain what it will change',
    'Copy each fixed code block back into your files manually',
    'Verify only the vulnerable lines were changed',
  ],
  other: [
    'Open your preferred AI coding assistant',
    'Start a new conversation or session',
    'Paste the entire prompt as your first message',
    'Review suggested changes before applying them',
    'Only apply changes listed in the prompt',
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// IDE-specific preamble injected at the top of the prompt
// ─────────────────────────────────────────────────────────────────────────────

function getIdePrefix(ideType: IdeType, fileList: string[]): string {
  const fileLines = fileList.map((f) => `  - ${f}`).join('\n')

  switch (ideType) {
    case 'cursor':
      return [
        '@codebase',
        '',
        'I need you to fix security vulnerabilities in my code.',
        'The following files need modifications:',
        fileLines,
        '',
        'Follow ALL instructions below EXACTLY.',
        'Show me the exact lines you will change BEFORE applying them.',
        '',
      ].join('\n')

    case 'copilot':
      return [
        '// GitHub Copilot: Fix security vulnerabilities listed below.',
        '// Follow every instruction EXACTLY.',
        '// Do NOT modify any code that is not listed below.',
        '//',
        '// Files to fix:',
        fileList.map((f) => `//   ${f}`).join('\n'),
        '//',
        '',
      ].join('\n')

    case 'windsurf':
      return [
        'Windsurf, I need surgical security fixes applied to my codebase.',
        'Do NOT use Cascade mode — I want targeted, minimal changes only.',
        '',
        'Files requiring changes:',
        fileLines,
        '',
      ].join('\n')

    case 'chatgpt':
      return [
        'You are a senior security engineer. Your task is to fix specific',
        'vulnerabilities in my code. Follow every instruction exactly.',
        '',
        'Files to modify:',
        fileLines,
        '',
      ].join('\n')

    case 'other':
    default:
      return [
        'Fix the security vulnerabilities listed below in my code.',
        'Follow every instruction exactly. Only modify the listed files.',
        '',
        'Files to modify:',
        fileLines,
        '',
      ].join('\n')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Single vulnerability block
// ─────────────────────────────────────────────────────────────────────────────

function buildVulnerabilityBlock(
  vuln: VulnerabilityForPrompt,
  index: number,
  total: number,
): string {
  const lang        = vuln.language ?? detectLanguage(vuln.filePath)
  const lineDisplay = vuln.lineNumber > 0 ? String(vuln.lineNumber) : 'See full file'
  const fileDisplay = vuln.filePath.trim() || 'Unknown file'
  const codeDisplay = vuln.vulnerableCode.trim() || '[Code snippet not available — check the file manually]'
  const fixDisplay  = vuln.fixedCode.trim()       || '[Manual review required — consult OWASP guidance]'
  const explanation = vuln.explanation.trim()      || 'No explanation provided — review the code at the line shown.'
  const reasoning   = vuln.fixReasoning.trim()     || 'Apply the fix shown above. It addresses the vulnerability type listed.'

  return `\
═══════════════════════════════════════════════════════════

### Vulnerability ${index + 1} of ${total}

**Type:**     ${vuln.type}
**Severity:** ${vuln.severity.toUpperCase()}
**OWASP:**    ${vuln.owaspId ?? 'See OWASP Top 10'}
**File:**     \`${fileDisplay}\`
**Line:**     ${lineDisplay}

**Current Vulnerable Code:**
\`\`\`${lang}
${codeDisplay}
\`\`\`

**Why This Is Vulnerable:**
${explanation}

**Suggested Secure Fix:**
\`\`\`${lang}
${fixDisplay}
\`\`\`

**Fix Reasoning:**
${reasoning}
`
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — generateMasterPrompt
// ─────────────────────────────────────────────────────────────────────────────

export function generateMasterPrompt(
  report: ScanReportForPrompt,
  ideType: IdeType,
): string {
  const vulns      = report.vulnerabilities
  const totalCount = vulns.length

  // Zero-vulnerability short-circuit
  if (totalCount === 0) {
    return [
      '# 🛡️ KAVACH Security Scan — No Vulnerabilities Found',
      '',
      'This scan found zero vulnerabilities. Your code is clean!',
      '',
      `Scan ID: ${report.scanId}`,
      `Project: ${report.projectName ?? 'Unknown project'}`,
    ].join('\n')
  }

  const uniqueFiles = [...new Set(vulns.map((v) => v.filePath).filter(Boolean))]
  const filesCount  = uniqueFiles.length
  const idePrefix   = getIdePrefix(ideType, uniqueFiles)
  const vulnBlocks  = vulns.map((v, i) => buildVulnerabilityBlock(v, i, totalCount)).join('\n')

  return `${idePrefix}
# 🛡️ KAVACH Security Fix Directive

## YOUR ROLE

You are a senior application security engineer with 10+ years of experience
in fixing vulnerabilities in production code. Your task is to apply security
fixes to the following code files with SURGICAL PRECISION.

## CRITICAL RULES — MUST FOLLOW

### 🚨 THE #1 RULE — SURGICAL FIXES ONLY

You MUST only modify the SPECIFIC LINES with vulnerabilities.

DO NOT:
❌ Refactor unrelated code
❌ Change coding style or formatting
❌ Rename variables or functions (unless the rename IS the fix)
❌ Add or remove features
❌ Modify files not listed below
❌ Update dependencies or package versions
❌ Reorganize imports
❌ Optimize performance
❌ Fix bugs unrelated to security vulnerabilities

DO:
✅ Change ONLY the vulnerable code lines specified below
✅ Preserve all surrounding code exactly as-is
✅ Match the existing coding style of each file
✅ Add a short comment above each fix
✅ Ask before making ANY change not listed here
✅ Preserve all whitespace and indentation
✅ Keep the same function and variable names

## SCOPE OF WORK

Total vulnerabilities to fix : ${totalCount}
Files affected               : ${filesCount}

Files you will modify (ONLY these):
${uniqueFiles.map((f) => `  - ${f}`).join('\n')}

## STEP-BY-STEP INSTRUCTIONS

For EACH vulnerability listed below:

  1. Locate the exact file path shown
  2. Navigate to the line number provided
  3. Verify the vulnerable code matches what is shown
  4. Apply the fix exactly as suggested (or a strictly safer equivalent)
  5. Add a single-line comment above the fix:
       // KAVACH-FIX: [vulnerability type]
  6. Confirm the change to the user before moving on
  7. Move to the next vulnerability

## VERIFICATION CHECKLIST (complete per file before moving on)

  - [ ] Only the lines listed as vulnerable were changed
  - [ ] Function signatures are identical to the original
  - [ ] Imports are the same (unless the fix requires a new one)
  - [ ] All other code in the file is character-perfect identical
  - [ ] The fix follows recognised security best practices
  - [ ] A KAVACH-FIX comment has been added

## VULNERABILITIES TO FIX

${vulnBlocks}

═══════════════════════════════════════════════════════════

## AFTER ALL FIXES ARE APPLIED

Please provide a summary that includes:

  1. Each file you modified
  2. How many vulnerabilities were fixed per file
  3. Any fix you SKIPPED and why
  4. Any concerns or questions about the changes

## ABSOLUTE BOUNDARIES

  - DO NOT commit or push any changes — leave that to the developer
  - DO NOT run the project, tests, or any shell commands
  - DO NOT install packages or modify lock files
  - DO NOT make changes not listed in this directive
  - If you are unsure about any fix: STOP and ask for clarification

## SUCCESS CRITERIA

  ✅ Every listed vulnerability is fixed
  ✅ Zero unrelated code is modified
  ✅ Code still functions identically to before
  ✅ Each fix has a KAVACH-FIX comment
  ✅ Developer can review every change with confidence

## FINAL REMINDER

Your #1 goal: fix vulnerabilities without touching anything else.
When in doubt — do LESS, not more. Ask for permission first.

═══════════════════════════════════════════════════════════

Ready? Start with Vulnerability 1.
Show me exactly which lines you will change BEFORE applying them.

🛡️ Generated by KAVACH AI Security Scanner
Scan ID: ${report.scanId}
Project: ${report.projectName ?? 'Unknown project'}
`
}
