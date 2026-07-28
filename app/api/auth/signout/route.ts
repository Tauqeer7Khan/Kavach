import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Check if we have a session
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    await supabase.auth.signOut()
  }

  // Cookies are cleared automatically by @supabase/ssr in our server client setup
  // when we call signOut()

  return NextResponse.json({ success: true }, { status: 200 })
}
