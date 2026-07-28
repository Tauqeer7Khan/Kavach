import { redirect } from 'next/navigation'

export default function RegisterPage() {
  // Supabase GitHub OAuth handles both login and registration in the same flow
  redirect('/login')
}
