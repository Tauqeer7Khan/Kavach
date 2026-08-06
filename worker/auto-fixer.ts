// worker/auto-fixer.ts
// KAVACH V2 — Auto-Fix Worker
// Reads vulnerable files, sends to Qwen for surgical fixes,
// validates results, saves back to Supabase.

import { Ollama } from 'ollama'
import { supabaseAdmin } from './supabase'

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'http://localhost:11434'
})

// ─────────────────────────────────────────────────────────
// Model routing config
// SMALL model for small files — fast, good enough
// LARGE model for big files — needs more intelligence
// ─────────────────────────────────────────────────────────

const FIX_MODEL_SMALL = process.env.OLLAMA_FIX_MODEL_SMALL || 'qwen2.5-coder:7b'
const FIX_MODEL_LARGE = process.env.OLLAMA_FIX_MODEL_LARGE || 'qwen2.5-coder:14b'
const HYBRID_LINE_THRESHOLD = 200  // Files below this use SMALL, above use LARGE

// ─────────────────────────────────────────────────────────
// Pick the right model based on file size
// ─────────────────────────────────────────────────────────

function pickFixModel(lineCount: number): { model: string; label: string } {
  if (lineCount < HYBRID_LINE_THRESHOLD) {
    return { model: FIX_MODEL_SMALL, label: '7B (fast)' }
  }
  return { model: FIX_MODEL_LARGE, label: '14B (accurate)' }
}

const FIX_TIMEOUT_MS = 120_000 // 2 min — search/replace is small output

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface VulnForFix {
  id: string
  name: string
  severity: string
  file_path: string | null
  line_number: number | null
  line_end: number | null
  vulnerable_code: string | null
  fixed_code: string | null
  ai_explanation: string | null
  ai_fix_explanation: string | null
  owasp_id: string | null
}

interface FileFixResult {
  file_path: string
  original_content: string
  fixed_content: string
  vulnerabilities_fixed: string[]
  lines_changed: number
  status: 'fixed' | 'skipped' | 'failed'
  skip_reason?: string
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function countChangedLines(original: string, fixed: string): number {
  const origLines = original.split('\n')
  const fixLines = fixed.split('\n')
  let count = 0
  for (let i = 0; i < Math.max(origLines.length, fixLines.length); i++) {
    if (origLines[i] !== fixLines[i]) count++
  }
  return count
}

// ─────────────────────────────────────────────────────────
// NEW — Search/Replace prompt (fast, small output)
// ─────────────────────────────────────────────────────────

function buildFixPrompt(
  filePath: string,
  language: string,
  originalCode: string,
  vulns: VulnForFix[]
): string {
  // Add line numbers for AI reference
  const numberedCode = originalCode
    .split('\n')
    .map((line, i) => `${String(i + 1).padStart(4, ' ')} | ${line}`)
    .join('\n')

  const vulnList = vulns.map((v, i) => {
    const lineRange = v.line_end && v.line_end !== v.line_number
      ? `lines ${v.line_number}-${v.line_end}`
      : `line ${v.line_number}`

    return `
─── Vulnerability ${i + 1} of ${vulns.length} ───
Type:       ${v.name}
Severity:   ${v.severity}
Location:   ${lineRange}
Pattern:    ${v.vulnerable_code ?? '(see line above)'}
Danger:     ${v.ai_explanation ?? 'confirmed by security scanner'}
${v.fixed_code ? `Fix hint:   ${v.fixed_code}` : ''}
${v.ai_fix_explanation ? `Approach:   ${v.ai_fix_explanation}` : ''}`
  }).join('\n')

  return `You are a security patcher. Your job is to APPLY FIXES, not to audit code.

═══ CRITICAL — THE SCANNER IS ALWAYS RIGHT ═══

A professional security scanner (Semgrep + AI analysis) has ALREADY
CONFIRMED these vulnerabilities exist. Your job is to fix them.

You are NOT allowed to:
✗ Question whether the vulnerability is real
✗ Argue that the code "might not be exploitable"
✗ Say "no vulnerabilities found"
✗ Wait for proof of user input
✗ Ask for more context

You ARE required to:
✓ Trust the scanner's findings unconditionally
✓ Apply a defensive fix even if exploitability is unclear
✓ Assume ALL external data is untrusted
✓ Use the fix patterns below when they apply

═══ STANDARD FIX PATTERNS (apply these when you see the type) ═══

Type: path-join-resolve-traversal / Path Traversal
  Fix pattern:
    - Validate/sanitize the path segment with path.basename()
    - Or use path.resolve() and check it starts with the safe root
  Example:
    BEFORE: const p = path.join(dir, userFile)
    AFTER:  const safe = path.basename(userFile)
            const p = path.join(dir, safe)

Type: spawn-shell-true / Command Injection via shell:true
  Fix pattern:
    - Set shell: false
    - Pass command and args as separate array elements
  Example:
    BEFORE: spawn(cmd, [], { shell: true })
    AFTER:  const [bin, ...args] = cmd.split(' ')
            spawn(bin, args, { shell: false })

Type: SQL Injection / sql-injection
  Fix pattern:
    - Use parameterized queries
    - Never concatenate user input into query strings
  Example:
    BEFORE: db.query("SELECT * FROM t WHERE id=" + id)
    AFTER:  db.query("SELECT * FROM t WHERE id=$1", [id])

Type: Code Injection / eval / new Function
  Fix pattern:
    - Remove eval entirely
    - Use JSON.parse() if parsing JSON
    - Use a safe expression evaluator library for math
  Example:
    BEFORE: eval(userInput)
    AFTER:  JSON.parse(userInput)  // if input is JSON
            // or throw new Error('Dynamic execution not allowed')

Type: XSS / dangerouslySetInnerHTML / innerHTML
  Fix pattern:
    - Use textContent instead of innerHTML
    - Or sanitize with DOMPurify.sanitize()

Type: Hardcoded Secret / API Key
  Fix pattern:
    - Replace literal string with process.env.VAR_NAME
    - Add a fallback throw if env var is missing
  Example:
    BEFORE: const key = "sk_live_abc123"
    AFTER:  const key = process.env.STRIPE_KEY
            if (!key) throw new Error('STRIPE_KEY missing')

Type: Weak Cryptography / md5 / sha1
  Fix pattern:
    - Replace md5/sha1 with sha256 or bcrypt
  Example:
    BEFORE: createHash('md5')
    AFTER:  createHash('sha256')

For ANY other vulnerability type: apply the "Fix hint" or "Approach"
from the vulnerability details below. Do your best defensive fix.

═══ OUTPUT FORMAT (STRICT) ═══

For EACH vulnerability, output ONE block:

<<<<<<< SEARCH
[2-4 lines copied EXACTLY from the file below]
=======
[same lines with your fix + // KAVACH-FIX: [type] comment]
>>>>>>> REPLACE

RULES:
1. SEARCH must be COPY-PASTED from the numbered code below
   (without the "NNNN | " prefix)
2. SEARCH must be UNIQUE — include 1-2 lines of context if needed
3. Preserve exact indentation (spaces vs tabs)
4. Add "// KAVACH-FIX: [type]" comment above your fix
5. Multiple vulnerabilities = multiple blocks, back-to-back
6. NO explanations, NO markdown fences, NO commentary

═══ WHEN YOU MAY SKIP (very restrictive) ═══

You may output "KAVACH_SKIP: [reason]" ONLY IF:
- The specified line number is out of range (file too short)
- The specified line is genuinely a blank line or import statement
- Applying the fix would require changes that break the file's exports

NEVER skip because:
- You cannot see user input reaching the sink
- The vulnerability "might not be real"
- The code "looks fine to you"
- You want more context

═══ THE FILE ═══

FILE:     ${filePath}
LANGUAGE: ${language}

VULNERABILITIES CONFIRMED BY SCANNER (all must be fixed):
${vulnList}

CODE (line numbers are for your reference — DO NOT include them in output):
\`\`\`${language}
${numberedCode}
\`\`\`

Output SEARCH/REPLACE blocks now. Fix every vulnerability listed.`
}

// ─────────────────────────────────────────────────────────
// Apply search/replace blocks to original content
// ─────────────────────────────────────────────────────────

interface ApplyResult {
  success: boolean
  fixedContent: string
  blocksApplied: number
  blocksFailed: number
  errors: string[]
}

function applySearchReplaceBlocks(
  original: string,
  aiOutput: string
): ApplyResult {
  const errors: string[] = []
  let blocksApplied = 0
  let blocksFailed = 0
  let current = original

  // Match all SEARCH/REPLACE blocks
  const blockRegex = /<<<<<<< SEARCH\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> REPLACE/g
  const blocks: Array<{ search: string; replace: string }> = []

  let match
  while ((match = blockRegex.exec(aiOutput)) !== null) {
    blocks.push({
      search: match[1],
      replace: match[2],
    })
  }

  if (blocks.length === 0) {
    return {
      success: false,
      fixedContent: original,
      blocksApplied: 0,
      blocksFailed: 0,
      errors: ['No SEARCH/REPLACE blocks found in AI output'],
    }
  }

  for (const [idx, block] of blocks.entries()) {
    // Try exact match first
    if (current.includes(block.search)) {
      current = current.replace(block.search, block.replace)
      blocksApplied++
      continue
    }

    // Try normalizing whitespace (tabs vs spaces, trailing whitespace)
    const normalizedSearch = block.search
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+$/gm, '')
    const normalizedCurrent = current
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+$/gm, '')

    if (normalizedCurrent.includes(normalizedSearch)) {
      current = normalizedCurrent.replace(normalizedSearch, block.replace)
      blocksApplied++
      continue
    }

    // Failed to find
    blocksFailed++
    errors.push(
      `Block ${idx + 1}: SEARCH text not found in file. First 60 chars: "${block.search.slice(0, 60).replace(/\n/g, '\\\n')}..."`
    )
  }

  return {
    success: blocksApplied > 0,
    fixedContent: current,
    blocksApplied,
    blocksFailed,
    errors,
  }
}

// ─────────────────────────────────────────────────────────
// Validate the fix — much lighter check now
// ─────────────────────────────────────────────────────────

function validateFix(
  original: string,
  fixed: string
): { valid: boolean; reason?: string } {
  if (!fixed.trim()) {
    return { valid: false, reason: 'Fixed content is empty' }
  }

  // Fix must be different from original
  if (fixed === original) {
    return { valid: false, reason: 'No changes were applied' }
  }

  // Sanity check — length shouldn't change wildly
  // (search/replace should be small deltas)
  const originalLen = original.length
  const fixedLen = fixed.length
  const diff = Math.abs(fixedLen - originalLen)
  const percentDiff = diff / originalLen

  if (percentDiff > 0.5) {
    return {
      valid: false,
      reason: `Fix changed file size by ${Math.round(percentDiff * 100)}% — unexpected`
    }
  }

  return { valid: true }
}

// ─────────────────────────────────────────────────────────
// Fix one file using search/replace approach
// ─────────────────────────────────────────────────────────

async function fixFileWithAI(
  filePath: string,
  language: string,
  originalContent: string,
  vulns: VulnForFix[]
): Promise<FileFixResult> {
  const lineCount = originalContent.split('\n').length
  const { model, label } = pickFixModel(lineCount)

  const prompt = buildFixPrompt(filePath, language, originalContent, vulns)

  try {
    console.log(`🔧 Fixing ${filePath} (${vulns.length} vulns, ${lineCount} lines) using ${label}...`)
    const startTime = Date.now()



    const response = await Promise.race([
      ollama.chat({
        model,
        messages: [{ role: 'user', content: prompt }],
        options: {
          temperature: 0.15, // Slightly higher — helps AI infer matches
          top_p: 0.2, // Also bump slightly
          top_k: 20,
          repeat_penalty: 1.1,
          num_ctx: 16384,
          num_predict: 2048,
        }
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Fix timeout')), FIX_TIMEOUT_MS)
      )
    ])

    const elapsed = Math.round((Date.now() - startTime) / 1000)
    const aiOutput = response.message.content.trim()

    console.log(`🔧 AI (${label}) responded in ${elapsed}s (${aiOutput.length} chars)`)



    // Check for skip signal — retry once if AI is being too cautious
    if (aiOutput.startsWith('KAVACH_SKIP:')) {
      const firstReason = aiOutput.replace('KAVACH_SKIP:', '').trim()

      // Retry with a stricter "must attempt" prompt
      console.log(`⚠️ AI tried to skip ${filePath} — retrying with stricter prompt...`)

      const retryPrompt = prompt + `

═══ CRITICAL RETRY — YOU SKIPPED INCORRECTLY ═══

You just tried to skip with: "${firstReason}"

This is WRONG. The scanner has confirmed vulnerabilities exist.
Skipping is not an option here.

Look at the specific line numbers listed in each vulnerability above.
The code AT THOSE LINES is what needs fixing. Trust the scanner.

Even if you personally don't see how the vulnerability could be exploited,
apply a DEFENSIVE fix based on the vulnerability TYPE:

- If type mentions "path" or "traversal" → sanitize the path variable
- If type mentions "shell" or "spawn" → set shell:false, split args
- If type mentions "injection" or "sql" → use parameterized queries  
- If type mentions "eval" or "code injection" → remove eval
- If type mentions "secret" or "hardcoded" → use process.env
- If type mentions "crypto" or "md5" or "sha1" → use sha256

Output SEARCH/REPLACE blocks NOW. No more skipping.`

      const retryStart = Date.now()
      const retryResponse = await Promise.race([
        ollama.chat({
          model,
          messages: [{ role: 'user', content: retryPrompt }],
          options: {
            temperature: 0.25,   // Even more freedom on retry
            top_p: 0.3,
            top_k: 30,
            repeat_penalty: 1.1,
            num_ctx: 16384,
            num_predict: 2048,
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Fix retry timeout')), FIX_TIMEOUT_MS)
        )
      ])

      const retryElapsed = Math.round((Date.now() - retryStart) / 1000)
      const retryOutput = retryResponse.message.content.trim()
      console.log(`🔧 Retry (${label}) responded in ${retryElapsed}s (${retryOutput.length} chars)`)

      // If STILL skip, accept it
      if (retryOutput.startsWith('KAVACH_SKIP:')) {
        const finalReason = retryOutput.replace('KAVACH_SKIP:', '').trim()
        console.log(`⏭️ AI skipped ${filePath} after retry: ${finalReason}`)
        return {
          file_path: filePath,
          original_content: originalContent,
          fixed_content: originalContent,
          vulnerabilities_fixed: [],
          lines_changed: 0,
          status: 'skipped',
          skip_reason: `First: ${firstReason} | Retry: ${finalReason}`,
        }
      }

      // Retry produced blocks — use them
      const retryResult = applySearchReplaceBlocks(originalContent, retryOutput)
      if (retryResult.success) {
        const changed = countChangedLines(originalContent, retryResult.fixedContent)
        console.log(`✅ Fixed ${filePath} on retry: ${retryResult.blocksApplied} blocks, ${changed} lines changed`)
        return {
          file_path: filePath,
          original_content: originalContent,
          fixed_content: retryResult.fixedContent,
          vulnerabilities_fixed: vulns.map(v => v.id),
          lines_changed: changed,
          status: 'fixed',
        }
      }

      // Retry produced blocks but they didn't apply
      return {
        file_path: filePath,
        original_content: originalContent,
        fixed_content: originalContent,
        vulnerabilities_fixed: [],
        lines_changed: 0,
        status: 'failed',
        skip_reason: `Retry output could not be applied: ${retryResult.errors[0] ?? 'unknown'}`,
      }
    }

    // Apply search/replace blocks
    const applyResult = applySearchReplaceBlocks(originalContent, aiOutput)

    if (!applyResult.success) {
      console.warn(`⚠️ No blocks applied for ${filePath}:`)
      applyResult.errors.forEach(e => console.warn(`   ${e}`))
      return {
        file_path: filePath,
        original_content: originalContent,
        fixed_content: originalContent,
        vulnerabilities_fixed: [],
        lines_changed: 0,
        status: 'failed',
        skip_reason: `AI output could not be applied: ${applyResult.errors[0] ?? 'unknown'}`,
      }
    }

    // Partial success is still success
    if (applyResult.blocksFailed > 0) {
      console.warn(`⚠️ ${applyResult.blocksFailed} of ${applyResult.blocksApplied + applyResult.blocksFailed} blocks failed for ${filePath}`)
    }

    // Validate the fix
    const validation = validateFix(originalContent, applyResult.fixedContent)
    if (!validation.valid) {
      console.warn(`⚠️ Fix validation failed for ${filePath}: ${validation.reason}`)
      return {
        file_path: filePath,
        original_content: originalContent,
        fixed_content: originalContent,
        vulnerabilities_fixed: [],
        lines_changed: 0,
        status: 'failed',
        skip_reason: validation.reason,
      }
    }

    // Count changed lines
    const changedLines = countChangedLines(originalContent, applyResult.fixedContent)

    console.log(`✅ Fixed ${filePath}: ${applyResult.blocksApplied} blocks applied, ${changedLines} lines changed (${elapsed}s)`)

    return {
      file_path: filePath,
      original_content: originalContent,
      fixed_content: applyResult.fixedContent,
      vulnerabilities_fixed: vulns.map(v => v.id),
      lines_changed: changedLines,
      status: 'fixed',
    }

  } catch (error: any) {
    console.error(`❌ Failed to fix ${filePath}:`, error.message)
    return {
      file_path: filePath,
      original_content: originalContent,
      fixed_content: originalContent,
      vulnerabilities_fixed: [],
      lines_changed: 0,
      status: 'failed',
      skip_reason: error.message,
    }
  }
}

// ─────────────────────────────────────────────────────────
// MAIN EXPORT — processAutoFixJob
// ─────────────────────────────────────────────────────────

export async function processAutoFixJob(fixJobId: string): Promise<void> {
  console.log(`\n🔧 Starting auto-fix job: ${fixJobId}`)

  // Mark as processing
  await supabaseAdmin
    .from('auto_fix_jobs')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
      progress_percentage: 5,
      progress_message: 'Starting auto-fix...',
    })
    .eq('id', fixJobId)

  try {
    // Fetch the fix job
    const { data: fixJob, error: jobError } = await supabaseAdmin
      .from('auto_fix_jobs')
      .select('*')
      .eq('id', fixJobId)
      .single()

    if (jobError || !fixJob) {
      throw new Error(`Fix job not found: ${fixJobId}`)
    }

    const { scan_id, user_id, vulnerability_ids } = fixJob

    // Fetch requested vulnerabilities
    const { data: vulns, error: vulnError } = await supabaseAdmin
      .from('vulnerabilities')
      .select('*')
      .eq('scan_id', scan_id)
      .in('id', vulnerability_ids)

    if (vulnError || !vulns || vulns.length === 0) {
      throw new Error('No vulnerabilities found for this fix job')
    }

    // Fetch stored file contents
    const { data: fileContents, error: fileError } = await supabaseAdmin
      .from('scan_file_contents')
      .select('*')
      .eq('scan_id', scan_id)
      .gt('expires_at', new Date().toISOString())

    if (fileError || !fileContents || fileContents.length === 0) {
      throw new Error(
        'File contents have expired or are unavailable. ' +
        'Please rescan your code to use Auto-Fix.'
      )
    }

    // Group vulnerabilities by file
    const vulnsByFile = new Map<string, VulnForFix[]>()
    for (const vuln of vulns) {
      const fp = vuln.file_path ?? 'unknown'
      if (!vulnsByFile.has(fp)) vulnsByFile.set(fp, [])
      vulnsByFile.get(fp)!.push(vuln)
    }

    const totalFiles = vulnsByFile.size
    const fixedFiles: FileFixResult[] = []
    let processedFiles = 0

    // Process each file
    for (const [filePath, fileVulns] of vulnsByFile) {
      processedFiles++

      await supabaseAdmin
        .from('auto_fix_jobs')
        .update({
          progress_percentage: Math.round(10 + (80 * processedFiles / totalFiles)),
          progress_message: `Fixing file ${processedFiles} of ${totalFiles}: ${filePath.split('/').pop()} (${fileVulns.length} ${fileVulns.length === 1 ? 'vulnerability' : 'vulnerabilities'})`,
        })
        .eq('id', fixJobId)

      // Find stored content for this file
      const storedFile = fileContents.find(fc => {
        // Exact match
        if (fc.file_path === filePath) return true

        // One ends with the other (handles absolute vs relative)
        if (fc.file_path.endsWith(filePath)) return true
        if (filePath.endsWith(fc.file_path)) return true

        // Basename match (last resort — same filename)
        const fcBase = fc.file_path.split('/').pop()
        const fpBase = filePath.split('/').pop()
        if (fcBase && fpBase && fcBase === fpBase) return true

        return false
      })



      if (!storedFile) {
        console.warn(`⚠️ No stored content for ${filePath} — skipping`)
        fixedFiles.push({
          file_path: filePath,
          original_content: '',
          fixed_content: '',
          vulnerabilities_fixed: [],
          lines_changed: 0,
          status: 'skipped',
          skip_reason: 'File content not found in storage',
        })
        continue
      }

      const result = await fixFileWithAI(
        filePath,
        storedFile.language ?? 'javascript',
        storedFile.file_content,
        fileVulns
      )

      fixedFiles.push(result)
    }

    // Calculate summary
    const fixedCount = fixedFiles.filter(f => f.status === 'fixed').length
    const skippedCount = fixedFiles.filter(f => f.status === 'skipped').length
    const failedCount = fixedFiles.filter(f => f.status === 'failed').length

    // Save results
    await supabaseAdmin
      .from('auto_fix_jobs')
      .update({
        status: 'completed',
        fixed_files: fixedFiles,
        fixed_count: fixedCount,
        skipped_count: skippedCount,
        failed_count: failedCount,
        progress_percentage: 100,
        progress_message: `Done! Fixed ${fixedCount} of ${totalFiles} files (${fixJob.total_vulns} vulnerabilities processed)`,
        completed_at: new Date().toISOString(),
      })
      .eq('id', fixJobId)

    console.log(`\n✅ Auto-fix job ${fixJobId} complete`)
    console.log(`   Fixed: ${fixedCount} | Skipped: ${skippedCount} | Failed: ${failedCount}`)

  } catch (error: any) {
    console.error(`❌ Auto-fix job ${fixJobId} failed:`, error.message)

    await supabaseAdmin
      .from('auto_fix_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        progress_percentage: 0,
        progress_message: 'Fix failed — ' + error.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', fixJobId)

    throw error
  }
}
