// app/api/github/branches/route.ts
// KAVACH V2.2 — List branches of a GitHub repo (Enterprise only)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { Octokit } from '@octokit/rest'
import { parseRepoUrl } from '@/lib/github-client'

export async function GET(req: NextRequest) {
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
          message:         'Branch listing is an Enterprise feature.',
        },
        { status: 403 }
      )
    }

    // ── Parse query params ────────────────────────────────
    const { searchParams } = new URL(req.url)
    const repoUrl = searchParams.get('repoUrl')

    if (!repoUrl) {
      return NextResponse.json(
        { error: 'repoUrl query param is required' },
        { status: 400 }
      )
    }

    const parsed = parseRepoUrl(repoUrl)
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL' },
        { status: 400 }
      )
    }
    const { owner, repo } = parsed

    // ── Get GitHub access token ───────────────────────────
    const { data: { session } } = await supabase.auth.getSession()
    const sessionData = session as {
      provider_token?: string
      provider_refresh_token?: string
    } | null
    const githubToken =
      sessionData?.provider_token ??
      sessionData?.provider_refresh_token

    if (!githubToken) {
      return NextResponse.json(
        {
          error:   'auth_expired',
          message: 'GitHub authentication expired. Sign out and sign in again.',
        },
        { status: 401 }
      )
    }

    // ── Fetch branches from GitHub ────────────────────────
    const octokit = new Octokit({ auth: githubToken })

    try {
      // Fetch up to 100 branches (99% of repos have less than this)
      const { data: branches } = await octokit.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      })

      // Also fetch default branch
      const { data: repoData } = await octokit.repos.get({ owner, repo })
      const defaultBranch = repoData.default_branch

      // Sort: default branch first, then alphabetical
      const branchNames = branches
        .map(b => b.name)
        .sort((a, b) => {
          if (a === defaultBranch) return -1
          if (b === defaultBranch) return 1
          return a.localeCompare(b)
        })

      return NextResponse.json({
        success:       true,
        branches:      branchNames,
        defaultBranch: defaultBranch,
      })
    } catch (err) {
      const error = err as { status?: number; message?: string }
      if (error.status === 404) {
        return NextResponse.json(
          { error: 'Repository not found' },
          { status: 404 }
        )
      }
      if (error.status === 401 || error.status === 403) {
        return NextResponse.json(
          { error: 'Access denied to repository' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: error.message ?? 'Failed to fetch branches' },
        { status: 500 }
      )
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
