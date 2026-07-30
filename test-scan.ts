import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config({ path: '.env.local' });

// Setup Redis
const redisUrl = process.env.UPSTASH_REDIS_URL ||
    process.env.UPSTASH_REDIS_REST_URL || '';
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_TOKEN || '';

if (!redisUrl || !redisToken) {
    console.error('❌ Redis credentials not found');
    process.exit(1);
}

let finalUrl = redisUrl;
if (redisUrl.startsWith('https://')) {
    const host = redisUrl.replace('https://', '');
    finalUrl = `rediss://default:${redisToken}@${host}:6379`;
}

// Setup Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const connection = new IORedis(finalUrl, {
    maxRetriesPerRequest: null,
});

const queue = new Queue('kavach-security-scans', { connection });

async function addTestJob() {
    // Test IDs from seed data
    const testUserId = '11111111-1111-1111-1111-111111111111';
    const testProjectId = '22222222-2222-2222-2222-222222222221';

    console.log('🗄️  Creating scan record in Supabase...');

    // First create scan record in database
    const { data: scan, error: scanError } = await supabase
        .from('scans')
        .insert({
            project_id: testProjectId,
            user_id: testUserId,
            status: 'queued',
            progress_percentage: 0,
        })
        .select()
        .single();

    if (scanError || !scan) {
        console.error('❌ Failed to create scan record:', scanError);
        process.exit(1);
    }

    console.log('✅ Scan record created:', scan.id);
    console.log('📤 Adding job to queue...');

    const job = await queue.add('test-scan', {
        scanId: scan.id,
        projectId: testProjectId,
        userId: testUserId,
        files: [],
        sourceType: 'paste',
    });

    console.log('✅ Test job added successfully!');
    console.log('📋 Job ID:', job.id);
    console.log('🆔 Scan ID:', scan.id);
    console.log('👀 Watch your worker terminal now...');

    await queue.close();
    await connection.quit();
    process.exit(0);
}

addTestJob().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
});