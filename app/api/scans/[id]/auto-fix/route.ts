// app/api/scans/[id]/auto-fix/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { Queue } from 'bullmq'
import IORedis from 'ioredis'

// ── Redis connection (same as worker) ──────────────────────
function getRedisConnection() {
  const redisUrl   = process.env.UPSTASH_REDIS_REST_URL  || ''
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || ''

  if (!redisUrl || !redisToken) {
    throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN')
  }

  let finalUrl = redisUrl
  if (redisUrl.startsWith('https://')) {
    const host = redisUrl.replace('https://', '')
    finalUrl = `rediss://default:${redisToken}@${host}:6379`
  }

  return new IORedis(finalUrl, { maxRetriesPerRequest: null })
}

// ── GET — poll status of existing fix job ──────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scanId = params.id

    // Get the most recent fix job for this scan
    const { data: fixJob, error } = await supabase
      .from('auto_fix_jobs')
      .select('*')
      .eq('scan_id', scanId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !fixJob) {
      return NextResponse.json({ fixJob: null })
    }

    return NextResponse.json({ fixJob })

  } catch (err) {
    console.error('Auto-fix GET error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch fix job'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

// ── POST — start or cancel a fix job ──────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let connection: IORedis | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Tier check — Pro or Enterprise only ────────────────
    const { data: userData } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    const plan = userData?.plan ?? 'free'
    if (plan === 'free') {
      return NextResponse.json(
        {
          error: 'Pro tier required',
          upgradeRequired: true,
          message: 'Auto-Fix is available on Pro and Enterprise plans.',
        },
        { status: 403 }
      )
    }

    const scanId = params.id
    const body   = await req.json()
    const action = body.action as 'start' | 'cancel'

    // ── Cancel action ──────────────────────────────────────
    if (action === 'cancel') {
      await supabase
        .from('auto_fix_jobs')
        .update({ status: 'cancelled' })
        .eq('scan_id', scanId)
        .eq('user_id', user.id)
        .eq('status', 'pending')

      return NextResponse.json({ success: true })
    }

    // ── Start action ───────────────────────────────────────
    if (action !== 'start') {
      return NextResponse.json(
        { error: 'Invalid action. Use start or cancel.' },
        { status: 400 }
      )
    }

    const vulnerabilityIds: string[] = body.vulnerabilityIds ?? []

    if (vulnerabilityIds.length === 0) {
      return NextResponse.json(
        { error: 'No vulnerability IDs provided' },
        { status: 400 }
      )
    }

    // ── Verify scan belongs to user ────────────────────────
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('id, user_id')
      .eq('id', scanId)
      .eq('user_id', user.id)
      .single()

    if (scanError || !scan) {
      return NextResponse.json(
        { error: 'Scan not found or access denied' },
        { status: 404 }
      )
    }

    // ── Check file contents are available ──────────────────
    const { data: fileContents, error: fileError } = await supabase
      .from('scan_file_contents')
      .select('id, file_path, expires_at')
      .eq('scan_id', scanId)
      .gt('expires_at', new Date().toISOString())

    if (fileError || !fileContents || fileContents.length === 0) {
      return NextResponse.json(
        {
          error: 'files_expired',
          message:
            'File contents have expired or are unavailable. ' +
            'Please rescan your code to use Auto-Fix.',
        },
        { status: 422 }
      )
    }

    // ── Check for existing active job ──────────────────────
    const { data: existingJob } = await supabase
      .from('auto_fix_jobs')
      .select('id, status')
      .eq('scan_id', scanId)
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing'])
      .limit(1)
      .single()

    if (existingJob) {
      return NextResponse.json(
        {
          error: 'A fix job is already running for this scan.',
          fixJobId: existingJob.id,
        },
        { status: 409 }
      )
    }

    // ── Create fix job record ──────────────────────────────
    const { data: fixJob, error: createError } = await supabase
      .from('auto_fix_jobs')
      .insert({
        scan_id:           scanId,
        user_id:           user.id,
        status:            'pending',
        vulnerability_ids: vulnerabilityIds,
        total_vulns:       vulnerabilityIds.length,
        progress_percentage: 0,
        progress_message:  'Queued for processing...',
      })
      .select()
      .single()

    if (createError || !fixJob) {
      throw new Error('Failed to create fix job: ' + createError?.message)
    }

    // ── Queue the job ──────────────────────────────────────
    connection = getRedisConnection()

    const autoFixQueue = new Queue('kavach-auto-fixes', {
      connection,
    })

    await autoFixQueue.add(
      'fix-vulnerabilities',
      { fixJobId: fixJob.id },
      {
        attempts:  2,
        backoff:   { type: 'fixed', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail:     20,
      }
    )

    await autoFixQueue.close()

    return NextResponse.json({
      success:  true,
      fixJobId: fixJob.id,
      message:  'Fix job queued successfully',
    })

  } catch (err) {
    console.error('Auto-fix POST error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Failed to start fix job'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  } finally {
    if (connection) {
      try { connection.disconnect() } catch {}
    }
  }
}
