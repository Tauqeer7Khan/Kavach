// lib/pg-boss-client.ts
// KAVACH — Shared pg-boss factory for Next.js API routes
// Uses POOLED connection (port 6543) for serverless compatibility

import { PgBoss } from 'pg-boss'

let bossInstance: PgBoss | null = null
let bossStartPromise: Promise<PgBoss> | null = null

/**
 * Get or create a pg-boss instance.
 * Uses connection pooling for serverless environments (Vercel).
 * Reuses same instance across requests to avoid connection overhead.
 */
export async function getPgBoss(): Promise<PgBoss> {
  // Return existing instance if already started
  if (bossInstance) return bossInstance

  // If another request is currently starting, wait for it
  if (bossStartPromise) return bossStartPromise

  const connectionString = 
    process.env.DATABASE_URL_POOLED ?? 
    process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error(
      'Missing DATABASE_URL_POOLED or DATABASE_URL environment variable'
    )
  }

  bossStartPromise = (async () => {
    const boss = new PgBoss({
      connectionString,
      // Serverless-friendly config
      max: 5,                    // Small pool for serverless
      application_name: 'kavach-api',
      // pg-boss will create 'pgboss' schema on first start
      schema: 'pgboss',
    })

    boss.on('error', (err: unknown) => {
      console.error('❌ pg-boss error:', err)
    })

    await boss.start()
    bossInstance = boss
    return boss
  })()

  return bossStartPromise
}

/**
 * Queue names — must match worker subscription names
 */
export const QUEUE_NAMES = {
  SECURITY_SCANS: 'kavach-security-scans',
  AUTO_FIXES:     'kavach-auto-fixes',
} as const
