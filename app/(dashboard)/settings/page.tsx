import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Settings | KAVACH',
  description: 'Manage your KAVACH account and preferences',
}
import { createClient } from '@/lib/supabase-server'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Mail, User } from 'lucide-react'
import { GithubIcon } from '@/components/shared/GithubIcon'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const scansUsed    = profile?.scans_used_this_month ?? 0
  const scansLimit   = profile?.scans_limit ?? 5
  const scansPercent = Math.round((scansUsed / scansLimit) * 100)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Settings</h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[#1f1f1f] rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Profile</h2>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-indigo-500/20 
                          border border-indigo-500/30 flex items-center 
                          justify-center text-xl font-bold text-indigo-300">
            {(profile?.name ?? user.email ?? 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-zinc-900 dark:text-white font-medium">
              {profile?.name ?? 'Anonymous'}
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">{user.email}</p>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-[#1f1f1f]">
          <div className="flex items-center gap-3 text-sm pt-2">
            <Mail className="h-4 w-4 text-zinc-500 dark:text-zinc-500" />
            <span className="text-zinc-600 dark:text-zinc-400">Email</span>
            <span className="text-zinc-900 dark:text-white ml-auto">{user.email}</span>
          </div>

          {profile?.github_username && (
            <div className="flex items-center gap-3 text-sm">
              <GithubIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-500" size={16} />
              <span className="text-zinc-600 dark:text-zinc-400">GitHub</span>
              <span className="text-zinc-900 dark:text-white ml-auto">
                @{profile.github_username}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 text-sm">
            <User className="h-4 w-4 text-zinc-500 dark:text-zinc-500" />
            <span className="text-zinc-600 dark:text-zinc-400">Plan</span>
            <Badge className="ml-auto bg-zinc-100 dark:bg-zinc-800 text-zinc-300 border-0 capitalize">
              {profile?.plan ?? 'free'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Usage Card */}
      <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[#1f1f1f] rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Usage This Month</h2>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Scans used</span>
            <span className="text-zinc-900 dark:text-white font-medium">
              {scansUsed} / {scansLimit}
            </span>
          </div>
          <Progress value={scansPercent} className="h-2 bg-[#1f1f1f]" />
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Resets on the 1st of each month
          </p>
        </div>

        {scansUsed >= scansLimit && (
          <div className="bg-amber-500/10 border border-amber-500/20 
                          rounded-lg p-3 text-sm text-amber-300">
            You&apos;ve reached your monthly scan limit.
            Upgrade to Pro for unlimited scans.
          </div>
        )}
      </div>

      {/* Account Info Card */}
      <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[#1f1f1f] rounded-xl p-6 space-y-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Account Info</h2>
        <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2">
          <div className="flex justify-between">
            <span>Member since</span>
            <span className="text-zinc-900 dark:text-white">
              {new Date(user.created_at).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>User ID</span>
            <span className="font-mono text-zinc-500 dark:text-zinc-500 text-xs">{user.id}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
