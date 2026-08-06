import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ScanStatusResponse } from '@/types';
import { z } from 'zod';
import { getQueuePosition, getQueueStats } from '@/lib/queue';

const uuidSchema = z.string().uuid();

/**
 * GET /api/scan/[id]
 * 
 * Polling endpoint to check the current status of a security scan.
 * The frontend calls this endpoint periodically (e.g., every 3 seconds)
 * to update the UI in real-time as the worker progresses through the scan.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Validate scan ID format
    const scanId = params.id;
    const uuidValidation = uuidSchema.safeParse(scanId);
    
    if (!uuidValidation.success) {
      return NextResponse.json({ error: 'Invalid scan ID' }, { status: 400 });
    }

    // 2. Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Fetch scan from database
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('*, projects(name, repo_url)')
      .eq('id', scanId)
      .single();

    if (scanError || !scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // 4. Verify scan belongs to current user
    if (scan.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let queuePosition: number | null = null;
    let estimatedWaitSeconds: number | null = null;

    // 5. If scan status is 'queued', calculate queue position & wait time
    if (scan.status === 'queued') {
      try {
        // Attempt to get position and stats gracefully
        const position = await getQueuePosition(scanId);
        const stats = await getQueueStats();
        
        queuePosition = position;
        
        // For simplicity, estimate wait based on waiting count or explicit position
        // If the position is known, we'll estimate 90s per preceding item
        // Otherwise, use overall waiting count as a fallback heuristic
        const countToUse = queuePosition > 0 ? queuePosition : stats.waiting;
        estimatedWaitSeconds = countToUse * 90;
      } catch (redisError) {
        // Handle graceful failures if Redis is unreachable
        console.warn(`Failed to fetch queue info for scan ${scanId}:`, redisError);
        // Do not crash, keep queuePosition and estimatedWaitSeconds as null
      }
    }
    // 6. If status is NOT queued, values remain null

    // 7. Return response
    const responseData: ScanStatusResponse & { success: boolean } = {
      success: true,
      scan: scan,
      queuePosition: queuePosition !== null ? queuePosition : undefined,
      estimatedWaitSeconds: estimatedWaitSeconds !== null ? estimatedWaitSeconds : undefined,
    };

    const response = NextResponse.json(responseData);
    
    // Add caching headers to ensure the browser doesn't cache stale statuses
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
    
    return response;

  } catch (error: unknown) {
    console.error(`GET /api/scan/${params.id} error:`, error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Internal server error', message },
      { status: 500 }
    );
  }
}
