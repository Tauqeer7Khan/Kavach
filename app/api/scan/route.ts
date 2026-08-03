import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase-server';
import { addScanJob, getQueueStats } from '@/lib/queue';
import { CreateScanResponse, SourceType } from '@/types';

// ==========================================
// 1. Define Request Validation Schema
// ==========================================
const scanRequestSchema = z.object({
  projectName: z.string().min(1, "Project name is required").max(100, "Project name too long"),
  sourceType: z.enum(['upload', 'github', 'paste']),
  repoUrl: z.string().optional(),
  r2Keys: z.array(z.string()).optional(),
  pastedCode: z.string().max(100000, "Pasted code too long").optional(),
  language: z.string().optional()
}).refine(data => {
  if (data.sourceType === 'github' && !data.repoUrl) return false;
  if (data.sourceType === 'upload' && (!data.r2Keys || data.r2Keys.length === 0)) return false;
  if (data.sourceType === 'paste' && !data.pastedCode) return false;
  return true;
}, {
  message: "Missing required fields for the selected source type"
});

export async function POST(req: NextRequest) {
  try {
    // ==========================================
    // 2. Parse and Validate Request Body
    // ==========================================
    const body = await req.json();
    const parseResult = scanRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.format() },
        { status: 400 }
      );
    }
    
    const { projectName, sourceType, repoUrl, r2Keys, pastedCode, language } = parseResult.data;

    // ==========================================
    // 3. Authenticate User Session
    // ==========================================
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client for system-level inserts and updates
    const adminDb = await createAdminClient();

    // ==========================================
    // 4. Fetch User to Check Plan and Scan Limits
    // ==========================================
    const { data: userData, error: userError } = await adminDb
      .from('users')
      .select('scans_used_this_month, scans_limit, plan')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User record not found' }, { status: 500 });
    }

    if (userData.scans_used_this_month >= userData.scans_limit) {
      return NextResponse.json({ 
        error: 'Scan limit reached', 
        message: 'Upgrade to Pro for more scans' 
      }, { status: 429 });
    }

    // ==========================================
    // 5. Find or Create Project
    // ==========================================
    let projectId: string;
    const { data: existingProject } = await adminDb
      .from('projects')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', projectName)
      .single();

    if (existingProject) {
      projectId = existingProject.id;
    } else {
      const { data: newProject, error: projectError } = await adminDb
        .from('projects')
        .insert({
          user_id: user.id,
          name: projectName,
          source_type: sourceType,
          repo_url: repoUrl || null,
          primary_language: language || null,
          languages: language ? [language] : [],
          total_scans: 0,
        })
        .select('id')
        .single();

      if (projectError || !newProject) {
        console.error('Project creation error:', projectError);
        return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
      }
      projectId = newProject.id;
    }

    // ==========================================
    // 6. Create Scan Record
    // ==========================================
    const { data: newScan, error: scanError } = await adminDb
      .from('scans')
      .insert({
        project_id: projectId,
        user_id: user.id,
        status: 'queued',
        progress_percentage: 0,
      })
      .select('id')
      .single();

    if (scanError || !newScan) {
      console.error('Scan creation error:', scanError);
      return NextResponse.json({ error: 'Failed to create scan record' }, { status: 500 });
    }

    // ==========================================
    // 7. Increment User's Scan Usage
    // ==========================================
    await adminDb
      .from('users')
      .update({ scans_used_this_month: userData.scans_used_this_month + 1 })
      .eq('id', user.id);

    // ==========================================
    // 8. Add Job to BullMQ Queue
    // ==========================================
    const { jobId, position } = await addScanJob({
      scanId: newScan.id,
      projectId: projectId,
      userId: user.id,
      files: [], // Files array is processed directly by the worker based on sourceType
      sourceType: sourceType as SourceType,
      repoUrl: repoUrl,
      r2Keys: r2Keys,
      pastedCode: pastedCode,
      language: language
    });

    // ==========================================
    // 9. Calculate Estimated Wait Time
    // ==========================================
    const stats = await getQueueStats();
    const waitingCount = stats.waiting;
    const estimatedWaitSeconds = waitingCount * 90;

    // ==========================================
    // 10. Update Scan Record with Queue Position
    // ==========================================
    await adminDb
      .from('scans')
      .update({ queue_position: position })
      .eq('id', newScan.id);

    // ==========================================
    // 11. Return Success Response
    // ==========================================
    const response: CreateScanResponse & { success: boolean } = {
      success: true,
      scanId: newScan.id,
      projectId: projectId,
      jobId: jobId,
      queuePosition: position,
      estimatedWaitSeconds,
      message: 'Scan queued successfully'
    };
    
    return NextResponse.json(response);

  } catch (error: unknown) {
    console.error('POST /api/scan error:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Internal server error', message },
      { status: 500 }
    );
  }
}
