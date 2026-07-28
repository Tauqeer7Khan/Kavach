import { Queue } from 'bullmq'
import Redis from 'ioredis'
import { ScanJob } from '@/types'

// BullMQ requires a standard Redis connection, not the REST one.
// We'll construct a standard rediss:// URL from the REST URL/token if possible,
// or fallback to a standard REDIS_URL environment variable.
const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL
  }
  
  // Try to parse from Upstash REST variables
  const restUrl = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  
  if (restUrl && token) {
    try {
      const urlObj = new URL(restUrl)
      // e.g. https://free-jawfish-125755.upstash.io -> rediss://default:token@free-jawfish-125755.upstash.io:6379
      return `rediss://default:${token}@${urlObj.hostname}:6379`
    } catch (e) {
      console.warn('Failed to parse UPSTASH_REDIS_REST_URL', e)
    }
  }
  
  return 'redis://localhost:6379'
}

const connection = new Redis(getRedisUrl(), {
  maxRetriesPerRequest: null,
})

export const scanQueue = new Queue('kavach-security-scans', {
  connection,
})

export async function addScanJob(data: ScanJob): Promise<{ jobId: string, position: number }> {
  const job = await scanQueue.add('scan', data, {
    jobId: data.scanId, // Use scanId as the jobId for tracking
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  })
  
  const position = await getQueuePosition(job.id!)
  
  return {
    jobId: job.id!,
    position
  }
}

export async function getQueuePosition(jobId: string): Promise<number> {
  const state = await scanQueue.getJobState(jobId)
  if (state === 'waiting' || state === 'delayed') {
    const waitingJobs = await scanQueue.getWaiting()
    const index = waitingJobs.findIndex(job => job.id === jobId)
    if (index !== -1) {
      return index + 1
    }
    return waitingJobs.length + 1 // Fallback position
  }
  return 0 // Active or completed
}

export async function getQueueStats(): Promise<{ waiting: number, active: number, completed: number }> {
  const [waiting, active, completed] = await Promise.all([
    scanQueue.getWaitingCount(),
    scanQueue.getActiveCount(),
    scanQueue.getCompletedCount(),
  ])
  
  return {
    waiting,
    active,
    completed
  }
}
