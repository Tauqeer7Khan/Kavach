import * as dotenv from 'dotenv';
dotenv.config();

import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { orchestrateScan } from './scan-orchestrator';

// Ensure redis connection string is provided
const redisUrl = process.env.UPSTASH_REDIS_URL || '';
const redisToken = process.env.UPSTASH_REDIS_TOKEN || '';

if (!redisUrl || !redisToken) {
  console.error('❌ Missing UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN in environment variables');
  process.exit(1);
}

// Convert Upstash REST URL to Redis TLS URL format for BullMQ
let finalRedisUrl = redisUrl;
if (redisUrl.startsWith('https://')) {
  const host = redisUrl.replace('https://', '');
  finalRedisUrl = `rediss://default:${redisToken}@${host}:6379`;
}

// Connect to Upstash Redis using ioredis
// BullMQ requires maxRetriesPerRequest to be null
const connection = new IORedis(finalRedisUrl, {
  maxRetriesPerRequest: null,
});

const QUEUE_NAME = 'kavach-security-scans';

console.log('═══════════════════════════════════════════');
console.log('🛡️  KAVACH Worker Started');
console.log('═══════════════════════════════════════════');
console.log('💻 Running on: MacBook Air M5 (Local)');
console.log('🤖 AI Model: llama3.1:8b (Ollama)');
console.log('📡 Redis: Connected');
console.log('🗄️  Supabase: Connected');
console.log('⏳ Waiting for scan jobs...');
console.log('═══════════════════════════════════════════');

const worker = new Worker(
  QUEUE_NAME,
  async (job: Job) => {
    console.log(`\n⏳ Pickup Job: [ID: ${job.id}] Scan: [${job.data.scanId}] at ${new Date().toISOString()}`);
    await orchestrateScan(job);
  },
  {
    connection,
    concurrency: 1, // Process only ONE job at a time
  }
);

worker.on('completed', (job: Job) => {
  console.log(`✅ Job ${job.id} completed successfully.`);
});

worker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

// Graceful shutdown on SIGTERM and SIGINT
async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}, shutting down worker...`);
  await worker.close();
  connection.disconnect();
  console.log('Worker closed gracefully.');
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
