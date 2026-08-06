// app/api/scans/[id]/auto-fix/create-pr/route.ts

import { NextRequest, NextResponse } from 'next/server'
// IMPORTANT: use the same import as Phase 2 routes
import { createClient } from '@/lib/supabase-server'
import {
  createSecurityFixPR,
  parseRepoUrl,
  verifyRepoAccess,
  buildPRDescription,
  normalizePathForGitHub,
} from '@/lib/github-client'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Enterprise tier check ─────────────────────────────
    const { data: userData } = await supabase
      .from('users')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (userData?.plan !== 'enterprise') {
      return NextResponse.json(
        {
          error:           'Enterprise tier required',
          upgradeRequired: true,
          message:         'GitHub PR creation is an Enterprise feature.',
        },
        { status: 403 }
      )
    }

    const scanId = params.id
    const body   = await req.json()
    const { fixJobId, repoUrl, baseBranch, prTitle } = body as {
      fixJobId:    string
      repoUrl:     string
      baseBranch?: string
      prTitle?:    string
    }

    if (!fixJobId || !repoUrl) {
      return NextResponse.json(
        { error: 'fixJobId and repoUrl are required' },
        { status: 400 }
      )
    }

    // ── Parse repo URL ────────────────────────────────────
    const parsed = parseRepoUrl(repoUrl)
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL' },
        { status: 400 }
      )
    }
    const { owner, repo } = parsed

    // ── Get GitHub access token from session ──────────────
    const { data: { session } } = await supabase.auth.getSession()
    const githubToken =
      (session as any)?.provider_token ??
      (session as any)?.provider_refresh_token

    if (!githubToken) {
      return NextResponse.json(
        {
          error:   'auth_expired',
          message: 'GitHub authentication has expired. Sign out and sign in again with GitHub to grant PR permissions.',
        },
        { status: 401 }
      )
    }

    // ── Verify repo access ────────────────────────────────
    const accessCheck = await verifyRepoAccess(githubToken, owner, repo)
    if (!accessCheck.hasAccess) {
      return NextResponse.json(
        { error: accessCheck.error ?? 'Cannot access repository' },
        { status: 403 }
      )
    }
    if (!accessCheck.canPush) {
      return NextResponse.json(
        { error: 'You do not have push access to this repository' },
        { status: 403 }
      )
    }

    // ── Fetch fix job ─────────────────────────────────────
    const { data: fixJob, error: fjError } = await supabase
      .from('auto_fix_jobs')
      .select('*')
      .eq('id', fixJobId)
      .eq('user_id', user.id)
      .single()

    if (fjError || !fixJob) {
      return NextResponse.json({ error: 'Fix job not found' }, { status: 404 })
    }

    if (fixJob.status !== 'completed') {
      return NextResponse.json(
        { error: 'Fix job is not completed yet' },
        { status: 422 }
      )
    }

    const fixedFiles = (fixJob.fixed_files ?? []) as Array<{
      file_path:              string
      fixed_content:          string
      status:                 string
      vulnerabilities_fixed:  string[]
      lines_changed:          number
    }>

    const successfulFixes = fixedFiles.filter(f => f.status === 'fixed')

    if (successfulFixes.length === 0) {
      return NextResponse.json(
        { error: 'No successful fixes available to push' },
        { status: 422 }
      )
    }

    // ── Determine base branch ─────────────────────────────
    const finalBaseBranch = baseBranch?.trim() || accessCheck.defaultBranch || 'main'

    // ── Determine new branch name ─────────────────────────
    const dateStr   = new Date().toISOString().split('T')[0]
    const newBranch = `kavach/security-fix-${dateStr}-${scanId.slice(0, 8)}`

    // ── Fetch severity counts for PR body ─────────────────
    const { data: vulns } = await supabase
      .from('vulnerabilities')
      .select('severity')
      .eq('scan_id', scanId)
      .in('id', fixJob.vulnerability_ids)

    const severityCounts = {
      critical: vulns?.filter(v => v.severity === 'CRITICAL').length ?? 0,
      high:     vulns?.filter(v => v.severity === 'HIGH').length     ?? 0,
      medium:   vulns?.filter(v => v.severity === 'MEDIUM').length   ?? 0,
      low:      vulns?.filter(v => v.severity === 'LOW').length      ?? 0,
    }

    // ── Normalize file paths for GitHub ───────────────────
    const filesForGitHub = successfulFixes.map(f => ({
      path:    normalizePathForGitHub(f.file_path),
      content: f.fixed_content,
    }))

    // ── Build titles/bodies ───────────────────────────────
    const finalPrTitle = prTitle?.trim() ||
      `🛡️ Security fixes by KAVACH (${successfulFixes.length} ${successfulFixes.length === 1 ? 'file' : 'files'})`

    const finalPrBody = buildPRDescription({
      totalVulns:     fixJob.total_vulns,
      filesFixed:     successfulFixes.length,
      severityCounts,
      fixedFilesList: successfulFixes.map(f => ({
        path:         normalizePathForGitHub(f.file_path),
        vulnsFixed:   f.vulnerabilities_fixed.length,
        linesChanged: f.lines_changed,
      })),
    })

    const commitMessage = `🛡️ Security fixes by KAVACH\n\nFixed ${fixJob.total_vulns} vulnerabilities across ${successfulFixes.length} files.\n\nAuto-generated by KAVACH AI Security Scanner.`

    // ── Insert PR record (pending) ────────────────────────
    const { data: prRecord, error: prRecErr } = await supabase
      .from('github_prs')
      .insert({
        scan_id:               scanId,
        fix_job_id:            fixJobId,
        user_id:               user.id,
        repo_owner:            owner,
        repo_name:             repo,
        base_branch:           finalBaseBranch,
        head_branch:           newBranch,
        pr_title:              finalPrTitle,
        files_pushed:          successfulFixes.length,
        vulnerabilities_fixed: fixJob.total_vulns,
        status:                'creating',
      })
      .select()
      .single()

    if (prRecErr || !prRecord) {
      return NextResponse.json(
        { error: 'Failed to record PR: ' + prRecErr?.message },
        { status: 500 }
      )
    }

    // ── Actually create the PR on GitHub ──────────────────
    const result = await createSecurityFixPR({
      accessToken: githubToken,
      owner,
      repo,
      baseBranch:  finalBaseBranch,
      newBranch,
      files:       filesForGitHub,
      commitMessage,
      prTitle:     finalPrTitle,
      prBody:      finalPrBody,
    })

    // ── Update PR record with result ──────────────────────
    if (result.success) {
      await supabase
        .from('github_prs')
        .update({
          status:      'created',
          pr_number:   result.prNumber,
          pr_url:      result.prUrl,
          head_branch: result.branchName,
        })
        .eq('id', prRecord.id)

      return NextResponse.json({
        success:    true,
        prNumber:   result.prNumber,
        prUrl:      result.prUrl,
        branchName: result.branchName,
      })
    } else {
      await supabase
        .from('github_prs')
        .update({
          status:        'failed',
          error_message: result.error,
        })
        .eq('id', prRecord.id)

      return NextResponse.json(
        { error: result.error, errorCode: result.errorCode },
        { status: 500 }
      )
    }

  } catch (err: any) {
    console.error('Create PR error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Failed to create PR' },
      { status: 500 }
    )
  }
}
