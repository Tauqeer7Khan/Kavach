'use client'

import * as React from 'react'
import { GitMerge, Lock, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

interface AutoPushSectionProps {
  userPlan: 'free' | 'pro' | 'enterprise'
  initialRepoUrl?: string
  onChange: (data: { enabled: boolean; repoUrl?: string; owner?: string; repo?: string }) => void
}

export function AutoPushSection({ userPlan, initialRepoUrl, onChange }: AutoPushSectionProps) {
  const [enabled, setEnabled] = React.useState(false)
  const [repoUrl, setRepoUrl] = React.useState(initialRepoUrl || '')
  const [status, setStatus] = React.useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
  const [errorMsg, setErrorMsg] = React.useState('')
  const [validatedData, setValidatedData] = React.useState<{ owner?: string; repo?: string }>({})

  const isEnterprise = userPlan === 'enterprise'

  // Notify parent of changes
  React.useEffect(() => {
    if (!enabled) {
      onChange({ enabled: false })
      return
    }
    
    if (status === 'valid' && validatedData.owner && validatedData.repo) {
      onChange({
        enabled: true,
        repoUrl,
        owner: validatedData.owner,
        repo: validatedData.repo,
      })
    } else {
      onChange({ enabled: true }) // Not yet fully valid, but enabled
    }
  }, [enabled, status, repoUrl, validatedData, onChange])

  // Validate on URL change with debounce
  React.useEffect(() => {
    if (!enabled || !repoUrl) {
      if (!repoUrl) setStatus('idle')
      return
    }

    const timer = setTimeout(async () => {
      setStatus('validating')
      setErrorMsg('')

      try {
        const res = await fetch('/api/github/verify-repo-ownership', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl }),
        })
        const data = await res.json()

        if (res.ok && data.success) {
          setStatus('valid')
          setValidatedData({ owner: data.owner, repo: data.repo })
        } else {
          setStatus('invalid')
          setErrorMsg(data.error || 'Failed to verify repository')
        }
      } catch {
        setStatus('invalid')
        setErrorMsg('Network error occurred during verification')
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [repoUrl, enabled])

  return (
    <div className="rounded-xl border border-zinc-700/60 bg-zinc-900/50 overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <GitMerge className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-100">Auto-Push Fixes to GitHub</h3>
              {!isEnterprise && (
                <span className="flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                  <Lock className="h-3 w-3" /> Enterprise
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Automatically create pull requests for any AI fixes generated during the scan.
            </p>
          </div>
        </div>
        <div>
          <Switch
            checked={enabled}
            onCheckedChange={(checked: boolean) => {
              if (isEnterprise) setEnabled(checked)
            }}
            disabled={!isEnterprise}
            className="data-[state=checked]:bg-emerald-500"
          />
        </div>
      </div>

      {enabled && isEnterprise && (
        <div className="border-t border-zinc-800 p-4 bg-zinc-950/30">
          <label className="text-xs font-medium text-zinc-300">Target GitHub Repository</label>
          <div className="mt-1.5 relative">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 pr-10"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              {status === 'validating' && <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />}
              {status === 'valid' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              {status === 'invalid' && <XCircle className="h-4 w-4 text-red-400" />}
            </div>
          </div>
          {status === 'invalid' && errorMsg && (
            <p className="mt-2 text-xs text-red-400">{errorMsg}</p>
          )}
          {status === 'valid' && (
            <p className="mt-2 text-xs text-emerald-400/80">
              Repository verified. PRs will be pushed here.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
