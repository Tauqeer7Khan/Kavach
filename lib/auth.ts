import { createClient } from './supabase-client'

export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error fetching current user:', error)
    return null
  }
  return user
}

export async function getSession() {
  const supabase = createClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error fetching session:', error)
    return null
  }
  return session
}

export async function signInWithGitHub() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback`,
      scopes: 'repo read:user user:email',
    },
  })
  
  if (error) {
    console.error('Error signing in with GitHub', error)
    throw error
  }
  
  return data
}

export async function signOut() {
  try {
    // Clear server cookies
    const response = await fetch('/api/auth/signout', { method: 'POST' })
    if (!response.ok) {
      console.error('Failed to sign out on server')
    }
  } catch (err) {
    console.error('Error hitting signout endpoint:', err)
  }

  // Clear local client session
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('Error signing out:', error)
  }
  
  window.location.href = '/login'
}
