import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { parseRepoUrl, verifyRepoAccess } from '@/lib/github-client'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionData = session as {
      provider_token?: string
      provider_refresh_token?: string
    } | null

    const githubToken = sessionData?.provider_token ?? sessionData?.provider_refresh_token

    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub authentication missing or expired. Please sign in again with GitHub.' },
        { status: 401 }
      )
    }

    const { repoUrl } = await req.json()
    if (!repoUrl) {
      return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 })
    }

    const parsed = parseRepoUrl(repoUrl)
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid GitHub repository URL' }, { status: 400 })
    }

    const access = await verifyRepoAccess(githubToken, parsed.owner, parsed.repo)

    if (!access.hasAccess) {
      return NextResponse.json(
        { error: access.error ?? 'Repository not found or access denied' },
        { status: 403 }
      )
    }

    if (!access.canPush) {
      return NextResponse.json(
        { error: 'You do not have push access to this repository' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      owner: parsed.owner,
      repo: parsed.repo,
      defaultBranch: access.defaultBranch,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
