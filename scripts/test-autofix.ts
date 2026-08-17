// scripts/test-autofix.ts
// KAVACH Auto-Fix — End to End Test Script
// 
// HOW TO RUN (from project root):
//   npx ts-node scripts/test-autofix.ts
//
// WHAT IT TESTS:
//   1. Supabase connection
//   2. Ollama connection (Qwen 2.5 Coder)
//   3. auto_fix_jobs table exists and is writable
//   4. scan_file_contents table exists and is readable
//   5. processAutoFixJob() runs without crashing
//   6. Fixed files are saved back correctly

import * as dotenv from 'dotenv'
dotenv.config({ path: './worker/.env' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b'

// ── Colours for output ─────────────────────────────────────
const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const BLUE   = '\x1b[34m'
const RESET  = '\x1b[0m'

function pass(msg: string)    { console.log(`${GREEN}  ✅ PASS${RESET} — ${msg}`) }
function fail(msg: string)    { console.log(`${RED}  ❌ FAIL${RESET} — ${msg}`) }
function info(msg: string)    { console.log(`${BLUE}  ℹ️  INFO${RESET} — ${msg}`) }
function warn(msg: string)    { console.log(`${YELLOW}  ⚠️  WARN${RESET} — ${msg}`) }
function section(msg: string) {
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`  ${msg}`)
  console.log('─'.repeat(50))
}

// ── Test 1: Supabase connection ────────────────────────────
async function testSupabase(): Promise<boolean> {
  section('TEST 1 — Supabase Connection')
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (error) throw error
    pass('Connected to Supabase')
    info(`users table reachable — ${data?.length ?? 0} rows returned`)
    return true
  } catch (err: any) {
    fail(`Supabase connection failed: ${err.message}`)
    return false
  }
}

// ── Test 2: Ollama connection ──────────────────────────────
async function testOllama(): Promise<boolean> {
  section('TEST 2 — Ollama Connection')
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(10_000)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json() as { models: Array<{ name: string }> }
    const models = data.models?.map(m => m.name) ?? []
    pass(`Ollama is running at ${OLLAMA_URL}`)
    info(`Available models: ${models.join(', ') || 'none'}`)

    const hasSmall = models.some(m => m.includes('qwen2.5-coder:7b'))
    const hasLarge = models.some(m => m.includes('qwen2.5-coder:14b'))

    if (hasLarge) {
      pass('qwen2.5-coder:14b is available (large model)')
    } else {
      warn('qwen2.5-coder:14b NOT found — large files may fail')
    }
    if (hasSmall) {
      pass('qwen2.5-coder:7b is available (small model)')
    } else {
      warn('qwen2.5-coder:7b NOT found — small files will use 14b instead')
    }

    return true
  } catch (err: any) {
    fail(`Ollama not reachable: ${err.message}`)
    info('Start Ollama with: ollama serve')
    return false
  }
}

// ── Test 3: DB Tables exist ────────────────────────────────
async function testTables(): Promise<boolean> {
  section('TEST 3 — Database Tables')
  let allPassed = true

  const tables = [
    'users',
    'scans',
    'vulnerabilities',
    'scan_file_contents',
    'auto_fix_jobs',
  ]

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1)

      if (error) throw error
      pass(`Table exists: ${table}`)
    } catch (err: any) {
      fail(`Table missing or inaccessible: ${table} — ${err.message}`)
      allPassed = false
    }
  }

  return allPassed
}

// ── Test 4: Find a real completed scan ────────────────────
async function findTestScan(): Promise<string | null> {
  section('TEST 4 — Find Completed Scan with Vulnerabilities')

  try {
    const { data: scans, error } = await supabase
      .from('scans')
      .select('id, total_vulnerabilities, created_at')
      .eq('status', 'completed')
      .gt('total_vulnerabilities', 0)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) throw error

    if (!scans || scans.length === 0) {
      warn('No completed scans with vulnerabilities found')
      info('Run a scan first at https://ai-kavach.vercel.app')
      info('Use this test code to get vulnerabilities:')
      console.log(`
  const query = "SELECT * FROM users WHERE id=" + req.params.id
  eval(userInput)
  const apiKey = "sk-1234567890abcdef"
      `)
      return null
    }

    // Find one that still has file contents (not expired)
    for (const scan of scans) {
      const { data: files } = await supabase
        .from('scan_file_contents')
        .select('id')
        .eq('scan_id', scan.id)
        .gt('expires_at', new Date().toISOString())
        .limit(1)

      if (files && files.length > 0) {
        pass(`Found usable scan: ${scan.id}`)
        info(`Total vulnerabilities: ${scan.total_vulnerabilities}`)
        info(`Created: ${new Date(scan.created_at).toLocaleString()}`)
        return scan.id
      }
    }

    warn('Found completed scans but all file contents have expired (48h limit)')
    info('Rescan your code to test auto-fix with fresh file contents')
    return null

  } catch (err: any) {
    fail(`Could not find test scan: ${err.message}`)
    return null
  }
}

// ── Test 5: Create and run a mock auto-fix job ─────────────
// Returns the fixJobId if successful so Test 6 can use it
async function testAutoFixJob(scanId: string): Promise<string | null> {
  section('TEST 5 — Create Mock Auto-Fix Job')

  let fixJobId: string | null = null

  try {
    // Get vulnerabilities for this scan
    const { data: vulns, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('id, name, severity, file_path, line_number')
      .eq('scan_id', scanId)
      .limit(3)  // Only test with first 3 to keep it fast

    if (vulnError || !vulns || vulns.length === 0) {
      fail('No vulnerabilities found for this scan')
      return null
    }

    info(`Testing with ${vulns.length} vulnerabilities:`)
    vulns.forEach(v => {
      console.log(`     • ${v.name} (${v.severity}) in ${v.file_path}:${v.line_number}`)
    })

    // Get the user ID from the scan
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('user_id')
      .eq('id', scanId)
      .single()

    if (scanError || !scan?.user_id) {
      fail('Could not get user ID from scan')
      return null
    }

    // Create a real auto_fix_jobs record
    const { data: fixJob, error: createError } = await supabase
      .from('auto_fix_jobs')
      .insert({
        scan_id:             scanId,
        user_id:             scan.user_id,
        status:              'pending',
        vulnerability_ids:   vulns.map(v => v.id),
        total_vulns:         vulns.length,
        progress_percentage: 0,
        progress_message:    'Test job — created by test-autofix.ts',
      })
      .select()
      .single()

    if (createError || !fixJob) {
      fail(`Failed to create fix job: ${createError?.message}`)
      return null
    }

    fixJobId = fixJob.id
    pass(`Created fix job: ${fixJobId}`)

    // Now run the actual processAutoFixJob
    info('Running processAutoFixJob()...')
    info('This may take 1-3 minutes depending on Qwen speed')
    console.log('')

    const { processAutoFixJob } = await import('../worker/auto-fixer')
    await processAutoFixJob(fixJobId!)

    // Check the result
    const { data: result, error: resultError } = await supabase
      .from('auto_fix_jobs')
      .select('*')
      .eq('id', fixJobId)
      .single()

    if (resultError || !result) {
      fail('Could not read fix job result')
      return null
    }

    console.log('')
    pass(`Fix job completed with status: ${result.status}`)
    info(`Fixed:   ${result.fixed_count}`)
    info(`Skipped: ${result.skipped_count}`)
    info(`Failed:  ${result.failed_count}`)

    if (result.status === 'completed') {
      const fixedFiles = result.fixed_files as any[]

      if (fixedFiles && fixedFiles.length > 0) {
        console.log('\n  Fixed Files:')
        for (const file of fixedFiles) {
          const icon = file.status === 'fixed'
            ? '✅' : file.status === 'skipped'
            ? '⏭️' : '❌'
          console.log(`    ${icon} ${file.file_path} — ${file.status}`)
          if (file.status === 'fixed' && file.lines_changed > 0) {
            info(`       ${file.lines_changed} lines changed`)
          }
          if (file.skip_reason) {
            warn(`       Reason: ${file.skip_reason}`)
          }
        }
      }

      return fixJobId
    }

    if (result.status === 'failed') {
      fail(`Fix job failed: ${result.error_message}`)
      return null
    }

    warn(`Unexpected status: ${result.status}`)
    return null

  } catch (err: any) {
    fail(`processAutoFixJob crashed: ${err.message}`)
    console.error(err)

    // Clean up failed test job
    if (fixJobId) {
      await supabase
        .from('auto_fix_jobs')
        .update({ status: 'failed', error_message: 'Test job — cleaned up' })
        .eq('id', fixJobId)
    }

    return null
  }
}

// ── Test 6: Verify diff viewer data format ─────────────────
async function testDiffViewerFormat(fixJobId?: string): Promise<boolean> {
  section('TEST 6 — Verify DiffViewer Data Format')

  if (!fixJobId) {
    // Find most recent completed fix job
    const { data: jobs } = await supabase
      .from('auto_fix_jobs')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)

    if (!jobs || jobs.length === 0) {
      warn('No completed fix jobs found — skipping format check')
      return true
    }

    fixJobId = jobs[0].id
    info(`Using existing fix job: ${fixJobId}`)
  }

  const { data: job } = await supabase
    .from('auto_fix_jobs')
    .select('*')
    .eq('id', fixJobId)
    .single()

  if (!job) {
    fail('Fix job not found')
    return false
  }

  // Check the shape matches what DiffViewer expects
  const fixedFiles = job.fixed_files as any[]

  if (!Array.isArray(fixedFiles)) {
    fail('fixed_files is not an array')
    return false
  }

  pass(`fixed_files is an array with ${fixedFiles.length} items`)

  let formatOk = true
  for (const [i, file] of fixedFiles.entries()) {
    const required = ['file_path', 'original_content', 'fixed_content', 'status']
    for (const field of required) {
      if (!(field in file)) {
        fail(`File ${i}: missing required field "${field}"`)
        formatOk = false
      }
    }
    if (!['fixed', 'skipped', 'failed'].includes(file.status)) {
      fail(`File ${i}: invalid status "${file.status}"`)
      formatOk = false
    }
  }

  if (formatOk) {
    pass('All fixed_files have correct shape for DiffViewer')
  }

  return formatOk
}

// ── MAIN ───────────────────────────────────────────────────
async function main() {
  console.log('\n🛡️  KAVACH Auto-Fix — End to End Test')
  console.log('═'.repeat(50))
  console.log(`  Supabase: ${process.env.SUPABASE_URL}`)
  console.log(`  Ollama:   ${OLLAMA_URL}`)
  console.log(`  Model:    ${OLLAMA_MODEL}`)
  console.log('═'.repeat(50))

  const results: Record<string, boolean> = {}

  results.supabase = await testSupabase()
  if (!results.supabase) {
    console.log('\n❌ Cannot continue — Supabase connection required')
    process.exit(1)
  }

  results.ollama  = await testOllama()
  results.tables  = await testTables()

  const scanId = await findTestScan()

  let completedFixJobId: string | undefined = undefined

  if (scanId) {
    const fixJobId = await testAutoFixJob(scanId)
    results.autofix = fixJobId !== null
    completedFixJobId = fixJobId ?? undefined
    results.format  = await testDiffViewerFormat(completedFixJobId)
  } else {
    warn('Skipping auto-fix test — no usable scan found')
    warn('Create a scan with vulnerable code first, then re-run this test')
    results.autofix = false
    results.format  = false
  }

  // Summary
  section('TEST SUMMARY')
  let allPassed = true
  for (const [name, passed] of Object.entries(results)) {
    if (passed) {
      pass(name)
    } else {
      fail(name)
      allPassed = false
    }
  }

  console.log('')
  if (allPassed) {
    console.log(`${GREEN}  🎉 All tests passed! Auto-Fix is working correctly.${RESET}`)
    console.log(`${GREEN}  Ready to build ZIP download (Option A).${RESET}\n`)
  } else {
    console.log(`${RED}  ❌ Some tests failed. Fix the issues above before proceeding.${RESET}\n`)
  }

  process.exit(allPassed ? 0 : 1)
}

main().catch(err => {
  console.error('\n❌ Test script crashed:', err)
  process.exit(1)
})
