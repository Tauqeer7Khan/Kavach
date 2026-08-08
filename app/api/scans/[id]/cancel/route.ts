import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const ACTIVE_STATES = ['queued', 'downloading', 'scanning', 'analyzing', 'scoring']

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

    const scanId = params.id

    // Fetch the scan to ensure it belongs to the user and is active
    const { data: scan, error: fetchError } = await supabase
      .from('scans')
      .select('id, status')
      .eq('id', scanId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !scan) {
      return NextResponse.json({ error: 'Scan not found or access denied' }, { status: 404 })
    }

    if (!ACTIVE_STATES.includes(scan.status)) {
      return NextResponse.json(
        { error: 'Cannot cancel a scan that is not in progress' },
        { status: 400 }
      )
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('scans')
      .update({
        status: 'cancelled',
        progress_message: 'Scan cancelled by user',
      })
      .eq('id', scanId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true, message: 'Scan cancelled successfully' })

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('Scan cancel error:', err)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
