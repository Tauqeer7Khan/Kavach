// app/api/scans/[id]/github-pr-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scanId = params.id
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the most recent PR for this scan
    const { data: pr, error } = await supabase
      .from('github_prs')
      .select('*')
      .eq('scan_id', scanId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !pr) {
      return NextResponse.json({ pr: null })
    }

    return NextResponse.json({ pr })

  } catch (err) {
    console.error('Get PR status error:', err)
    return NextResponse.json({ pr: null })
  }
}
