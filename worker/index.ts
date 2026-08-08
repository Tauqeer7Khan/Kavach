// worker/index.ts
// KAVACH Worker — pg-boss based (replaces BullMQ + Redis)

import * as dotenv from 'dotenv'
dotenv.config()

import { PgBoss } from 'pg-boss'
import { orchestrateScan } from './scan-orchestrator'
import { processAutoFixJob } from './auto-fixer'

// ── Environment validation ─────────────────────────────
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL environment variable')
  console.error('   Set it to your Supabase DIRECT connection string')
  console.error('   Format: postgresql://postgres.xxx:password@host:5432/postgres')
  process.exit(1)
}

// ── Queue names (must match API route usage) ───────────
const QUEUE_SCANS      = 'kavach-security-scans'
const QUEUE_AUTO_FIXES = 'kavach-auto-fixes'

// ── pg-boss instance ────────────────────────────────────
const boss = new PgBoss({
  connectionString: databaseUrl,
  max: 10,                              // Worker uses direct connection
  application_name: 'kavach-worker',
  schema: 'pgboss',
})

// ── Error handling ──────────────────────────────────────
boss.on('error', (error) => {
  console.error('❌ pg-boss error:', error)
})

// ── Startup ─────────────────────────────────────────────
async function startWorker() {
  console.log('═══════════════════════════════════════════')
  console.log('🛡️  KAVACH Worker Starting (pg-boss mode)')
  console.log('═══════════════════════════════════════════')

  try {
    await boss.start()
    console.log('📡 pg-boss: Connected to Supabase Postgres')
    
    // ── Ensure queues exist (idempotent — safe to call multiple times) ──
    try {
      await boss.createQueue(QUEUE_SCANS)
      console.log(`✅ Queue ready: ${QUEUE_SCANS}`)
    } catch (err: any) {
      // Queue already exists — that's fine
      if (!err.message?.includes('already exists')) {
        console.warn(`⚠️ Queue setup warning (${QUEUE_SCANS}):`, err.message)
      }
    }

    try {
      await boss.createQueue(QUEUE_AUTO_FIXES)
      console.log(`✅ Queue ready: ${QUEUE_AUTO_FIXES}`)
    } catch (err: any) {
      if (!err.message?.includes('already exists')) {
        console.warn(`⚠️ Queue setup warning (${QUEUE_AUTO_FIXES}):`, err.message)
      }
    }

  } catch (err: any) {
    console.error('❌ Failed to start pg-boss:', err.message)
    process.exit(1)
  }

  console.log('💻 Running on: Local Machine')
  console.log('🤖 AI Model: qwen2.5-coder (7B + 14B hybrid)')
  console.log('🗄️  Supabase: Connected')
  console.log('═══════════════════════════════════════════')

  // ── Subscribe to scan queue ──────────────────────────
  await boss.work(
    QUEUE_SCANS,
    {
      localConcurrency: 1,
      pollingIntervalSeconds: 2,
    },
    async (jobs) => {
      // pg-boss v10+ passes array of jobs
      const jobsArray = Array.isArray(jobs) ? jobs : [jobs]
      for (const job of jobsArray) {
        console.log(`\n⏳ Scan job picked up: [ID: ${job.id}] Scan: [${(job.data as any).scanId}]`)
        try {
          // Adapt job shape to match existing orchestrateScan signature
          await orchestrateScan({
            id: job.id,
            data: job.data as any,
          } as any)
          console.log(`✅ Scan job ${job.id} completed`)
        } catch (err: any) {
          console.error(`❌ Scan job ${job.id} failed:`, err.message)
          throw err  // Let pg-boss handle retry
        }
      }
    }
  )

  // ── Subscribe to auto-fix queue ──────────────────────
  await boss.work(
    QUEUE_AUTO_FIXES,
    {
      localConcurrency: 1,
      pollingIntervalSeconds: 2,
    },
    async (jobs) => {
      const jobsArray = Array.isArray(jobs) ? jobs : [jobs]
      for (const job of jobsArray) {
        console.log(`\n🔧 Auto-fix job picked up: [ID: ${job.id}]`)
        try {
          const { fixJobId } = job.data as { fixJobId: string }
          await processAutoFixJob(fixJobId)
          console.log(`✅ Auto-fix job ${job.id} completed`)
        } catch (err: any) {
          console.error(`❌ Auto-fix job ${job.id} failed:`, err.message)
          throw err
        }
      }
    }
  )

  console.log('⏳ Waiting for scan and fix jobs...\n')
}

// ── Graceful shutdown ──────────────────────────────────
async function gracefulShutdown(signal: string) {
  console.log(`\n📡 Received ${signal}, shutting down worker...`)
  try {
    await boss.stop({ graceful: true, timeout: 30_000 })
    console.log('✅ Worker stopped gracefully')
  } catch (err: any) {
    console.error('❌ Error during shutdown:', err.message)
  }
  process.exit(0)
}

process.on('SIGINT',  () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

// ── Boot ────────────────────────────────────────────────
startWorker().catch((err) => {
  console.error('❌ Worker crashed on startup:', err)
  process.exit(1)
})
