// lib/queue.ts
// KAVACH — Queue abstraction using pg-boss + Supabase Postgres
// (Migrated from BullMQ + Upstash Redis)

import { getPgBoss, QUEUE_NAMES } from './pg-boss-client'
import type { ScanJob } from '@/types'

// ── Types ──────────────────────────────────────────────

export interface QueueStats {
  waiting:  number
  active:   number
  completed: number
  failed:   number
}

// ── Add scan job to queue ──────────────────────────────

export async function addScanJob(jobData: ScanJob): Promise<{ jobId: string, position: number }> {
  const boss = await getPgBoss()
  
  // Ensure queue exists (idempotent)
  try {
    await boss.createQueue(QUEUE_NAMES.SECURITY_SCANS)
  } catch {
    // Already exists — fine
  }
  
  const jobId = await boss.send(QUEUE_NAMES.SECURITY_SCANS, jobData as unknown as object, {
    retryLimit: 2,
    retryDelay: 60,           // 60 sec between retries
    retentionSeconds: 7200,   // Job expires if not picked up in 2 hours
  })

  if (!jobId) {
    throw new Error('Failed to queue scan job')
  }

  const position = await getQueuePosition(jobId)

  return { jobId, position }
}

// ── Get queue position (approximate) ───────────────────

export async function getQueuePosition(jobId: string): Promise<number> {
  const boss = await getPgBoss()
  
  try {
    // pg-boss doesn't have direct position API, so we count waiting jobs
    // created before this job
    const job = await boss.getJobById(QUEUE_NAMES.SECURITY_SCANS, jobId)
    
    if (!job || job.state !== 'created' && job.state !== 'retry') {
      return 0  // Job is being processed or completed
    }

    // Count jobs created before this one
    const q = await boss.getQueue(QUEUE_NAMES.SECURITY_SCANS)
    return q?.readyCount ?? 0
  } catch (err) {
    console.error('Failed to get queue position:', err)
    return 0
  }
}

// ── Get overall queue statistics ───────────────────────

export async function getQueueStats(): Promise<QueueStats> {
  const boss = await getPgBoss()
  
  try {
    // pg-boss provides queue size (waiting jobs)
    const q = await boss.getQueue(QUEUE_NAMES.SECURITY_SCANS)
    
    return {
      waiting:   q?.readyCount ?? 0,
      active:    q?.activeCount ?? 0,
      completed: 0,   // Available via boss.getJobById() per job
      failed:    q?.failedCount ?? 0,
    }
  } catch (err) {
    console.error('Failed to get queue stats:', err)
    return { waiting: 0, active: 0, completed: 0, failed: 0 }
  }
}

// ── Add auto-fix job to queue ──────────────────────────

export async function addAutoFixJob(fixJobId: string): Promise<string> {
  const boss = await getPgBoss()
  
  try {
    await boss.createQueue(QUEUE_NAMES.AUTO_FIXES)
  } catch {
    // Already exists — fine
  }
  
  const jobId = await boss.send(QUEUE_NAMES.AUTO_FIXES, 
    { fixJobId },
    {
      retryLimit: 2,
      retryDelay: 30,
      retentionSeconds: 3600,
    }
  )

  if (!jobId) {
    throw new Error('Failed to queue auto-fix job')
  }

  return jobId
}
