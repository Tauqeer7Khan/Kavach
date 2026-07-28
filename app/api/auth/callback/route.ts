import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const redirectResponse = NextResponse.redirect(`${origin}${next}`)

  // Regular Supabase client for auth session
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            redirectResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !session?.user) {
    console.error('Error exchanging code for session:', error)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const user = session.user

  // Admin client using createClient directly — this truly bypasses RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const { error: upsertError } = await supabaseAdmin
    .from('users')
    .upsert({
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      github_id: user.app_metadata?.provider_id || null,
      github_username: user.user_metadata?.preferred_username || user.user_metadata?.user_name || null,
    }, { onConflict: 'id' })

  if (upsertError) {
    console.error('Error upserting user:', upsertError)
    return NextResponse.redirect(`${origin}/login?error=user_creation_failed`)
  }

  return redirectResponse
}