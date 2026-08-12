// components/scans/AutoPushFlow.tsx
'use client'

import * as React from 'react'
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  GitPullRequest,
  ExternalLink,
  X,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import type { FixJob } from './AutoFixButton'

// ── Types ──────────────────────────────────────────────────

interface AutoPushFlowProps {
  scanId: string
  scanStatus: string
  autoPushEnabled: boolean
  pushRepoUrl: string | null
  vulnerabilityIds: string[]
  vulnerabilityCount: number
  userPlan: 'free' | 'pro' | 'enterprise'
}

type FlowPhase = 
  | 'idle'           // Not started (scan not complete or auto-push disabled)
  | 'starting-fix'   // Triggering auto-fix
  | 'fixing'         // Fix in progress
  | 'starting-push'  // Triggering PR push
  | 'pushing'        // Push in progress
  | 'success'        // PR created successfully
  | 'fix-failed'     // Auto-fix failed
  | 'push-failed'    // Push failed after retries
  | 'cancelled'      // User cancelled

interface PRResult {
  prNumber: number
  prUrl: string
  branchName: string
  filesPushed: number
  vulnsFixed: number
}

// ── Constants ──────────────────────────────────────────────
const MAX_PUSH_RETRIES = 3
const RETRY_DELAY_MS = 3000
const FIX_POLL_INTERVAL_MS = 2500

// ─────────────────────────────────────────────────────────

export function AutoPushFlow({
  scanId,
  scanStatus,
  autoPushEnabled,
  pushRepoUrl,
  vulnerabilityIds,
  vulnerabilityCount,
  userPlan,
}: AutoPushFlowProps) {
  const { toast } = useToast()

  const [phase, setPhase] = React.useState<FlowPhase>('idle')
  const [fixJob, setFixJob] = React.useState<FixJob | null>(null)
  const [prResult, setPrResult] = React.useState<PRResult | null>(null)
  const [error, setError] = React.useState('')
  const [retryCount, setRetryCount] = React.useState(0)
  const [dismissed, setDismissed] = React.useState(false)

  const pollRef = React.useRef<NodeJS.Timeout | null>(null)
  const hasTriggeredRef = React.useRef(false)

  // ── Only run for Enterprise + auto-push enabled ────────
  const shouldRun = 
    userPlan === 'enterprise' && 
    autoPushEnabled && 
    !!pushRepoUrl &&
    vulnerabilityCount > 0

  // ── Trigger auto-fix when scan completes ───────────────
  React.useEffect(() => {
    if (!shouldRun) return
    if (scanStatus !== 'completed') return
    if (hasTriggeredRef.current) return
    if (phase !== 'idle') return

    hasTriggeredRef.current = true
    startFix()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRun, scanStatus, phase])

  // ── Check for existing PR on mount (in case user reloaded) ──
  React.useEffect(() => {
    if (!shouldRun) return
    if (scanStatus !== 'completed') return

    const checkExistingPR = async () => {
      try {
        const res = await fetch(`/api/scans/${scanId}/github-pr-status`)
        if (!res.ok) return
        const data = await res.json()
        if (data.pr && data.pr.status === 'created') {
          setPrResult({
            prNumber: data.pr.pr_number,
            prUrl: data.pr.pr_url,
            branchName: data.pr.head_branch,
            filesPushed: data.pr.files_pushed,
            vulnsFixed: data.pr.vulnerabilities_fixed,
          })
          setPhase('success')
          hasTriggeredRef.current = true // Don't trigger again
        }
      } catch {
        // Silent fail — normal flow continues
      }
    }

    checkExistingPR()
  }, [shouldRun, scanStatus, scanId])

  // ── Cleanup polling on unmount ─────────────────────────
  React.useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // ── Start auto-fix ─────────────────────────────────────
  const startFix = async () => {
    setPhase('starting-fix')
    setError('')

    try {
      const res = await fetch(`/api/scans/${scanId}/auto-fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          vulnerabilityIds,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setPhase('fix-failed')
        setError(data.message ?? data.error ?? 'Failed to start auto-fix')
        return
      }

      setPhase('fixing')
      startPollingFix()
    } catch (err) {
      setPhase('fix-failed')
      setError(err instanceof Error ? err.message : 'Network error')
    }
  }

  // ── Poll fix job status ────────────────────────────────
  const startPollingFix = () => {
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/scans/${scanId}/auto-fix`)
        const data = await res.json()

        if (!data.fixJob) return

        const job: FixJob = data.fixJob
        setFixJob(job)

        if (job.status === 'completed') {
          if (pollRef.current) clearInterval(pollRef.current)

          // Check if any files were fixed
          if (job.fixed_count === 0) {
            setPhase('fix-failed')
            setError('No files could be auto-fixed. All fixes were skipped or failed.')
            return
          }

          // Proceed to push
          setPhase('starting-push')
          setTimeout(() => startPush(job.id), 500)

        } else if (job.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current)
          setPhase('fix-failed')
          setError(job.error_message ?? 'Auto-fix failed')
        }
      } catch {
        // Network blip — keep polling
      }
    }, FIX_POLL_INTERVAL_MS)
  }

  // ── Start PR push ──────────────────────────────────────
  const startPush = async (fixJobId: string, retryAttempt = 0) => {
    setPhase('pushing')
    setRetryCount(retryAttempt)

    try {
      const res = await fetch(`/api/scans/${scanId}/auto-fix/create-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixJobId,
          repoUrl: pushRepoUrl,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Retry logic
        if (retryAttempt < MAX_PUSH_RETRIES - 1) {
          console.log(`Push failed, retrying (${retryAttempt + 2}/${MAX_PUSH_RETRIES})...`)
          setTimeout(() => startPush(fixJobId, retryAttempt + 1), RETRY_DELAY_MS)
          return
        }

        // All retries exhausted
        setPhase('push-failed')
        setError(data.message ?? data.error ?? 'PR creation failed after 3 retries')
        return
      }

      // Success!
      setPrResult({
        prNumber: data.prNumber,
        prUrl: data.prUrl,
        branchName: data.branchName,
        filesPushed: data.filesPushed ?? fixJob?.fixed_count ?? 0,
        vulnsFixed: data.vulnsFixed ?? fixJob?.total_vulns ?? 0,
      })
      setPhase('success')

      toast({
        title: '✅ Fixes pushed to GitHub!',
        description: `PR #${data.prNumber} opened on ${pushRepoUrl}`,
      })

    } catch (err) {
      if (retryAttempt < MAX_PUSH_RETRIES - 1) {
        setTimeout(() => startPush(fixJobId, retryAttempt + 1), RETRY_DELAY_MS)
        return
      }

      setPhase('push-failed')
      setError(err instanceof Error ? err.message : 'Network error after retries')
    }
  }

  // ── Cancel handler ─────────────────────────────────────
  const handleCancel = async () => {
    if (!confirm('Cancel the auto-push flow? Any in-progress fix will be stopped.')) return

    if (pollRef.current) clearInterval(pollRef.current)

    // Try to cancel the fix job if it's running
    if (fixJob?.id && (phase === 'fixing' || phase === 'starting-fix')) {
      try {
        await fetch(`/api/scans/${scanId}/auto-fix`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel' }),
        })
      } catch {
        // Best effort
      }
    }

    setPhase('cancelled')
    toast({
      title: 'Auto-push cancelled',
      description: 'You can trigger fixes manually anytime.',
    })
  }

  // ── Manual retry for push failure ──────────────────────
  const handleRetryPush = () => {
    if (!fixJob?.id) return
    setError('')
    setRetryCount(0)
    startPush(fixJob.id, 0)
  }

  // ─────────────────────────────────────────────────────────
  // ── RENDER ──────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────

  if (!shouldRun) return null
  if (phase === 'idle') return null
  if (phase === 'success' && dismissed) return null

  // ── STARTING FIX / FIXING PHASE ────────────────────────
  if (phase === 'starting-fix' || phase === 'fixing') {
    const pct = fixJob?.progress_percentage ?? 0
    const msg = fixJob?.progress_message ?? 'Starting auto-fix...'

    return (
      <div className="rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-5 mb-6">
        <div className="flex items-start gap-3">
          <Loader2 className="h-5 w-5 text-indigo-400 animate-spin shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Auto-Push in Progress
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Step 1 of 2: Auto-fixing vulnerabilities
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="text-xs text-zinc-400 hover:text-red-400 underline decoration-dotted"
              >
                Cancel
              </button>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                <span>{msg}</span>
                <span className="font-mono text-indigo-400">{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── STARTING PUSH / PUSHING PHASE ──────────────────────
  if (phase === 'starting-push' || phase === 'pushing') {
    return (
      <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-violet-500/10 p-5 mb-6">
        <div className="flex items-start gap-3">
          <Loader2 className="h-5 w-5 text-purple-400 animate-spin shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Pushing to GitHub
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Step 2 of 2: Creating branch and opening PR
                  {retryCount > 0 && (
                    <span className="ml-2 text-amber-400">
                      (retry {retryCount + 1}/{MAX_PUSH_RETRIES})
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setPhase('cancelled')}
                className="text-xs text-zinc-400 hover:text-red-400 underline decoration-dotted"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-3">
              Fixed {fixJob?.fixed_count} files · Pushing to {pushRepoUrl}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── SUCCESS PHASE ───────────────────────────────────────
  if (phase === 'success' && prResult) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-5 mb-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-emerald-300">
                  ✅ Security fixes pushed to your GitHub repository
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Branch: <code className="text-emerald-400 font-mono">{prResult.branchName}</code>
                </p>
                <p className="text-xs text-zinc-400">
                  {prResult.filesPushed} files fixed · {prResult.vulnsFixed} vulnerabilities addressed
                </p>
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="text-zinc-500 hover:text-zinc-300"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-3">
              Your original code was NOT modified. Review the changes and merge when ready.
            </p>
            <a
              href={prResult.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
              View PR #{prResult.prNumber} on GitHub
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── FIX FAILED PHASE ────────────────────────────────────
  if (phase === 'fix-failed') {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-amber-300">
              Auto-fix did not complete
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              {error}
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              You can use the manual fix options below to try again with different settings.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── PUSH FAILED PHASE ───────────────────────────────────
  if (phase === 'push-failed') {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 mb-6">
        <div className="flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-300">
                  Push to GitHub failed
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Tried {MAX_PUSH_RETRIES} times. Error: {error}
                </p>
                <p className="text-xs text-zinc-500 mt-2">
                  Your fixes are safe — you can retry the push or download them as a ZIP.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button
                onClick={handleRetryPush}
                className="bg-red-600 hover:bg-red-500 text-white text-xs h-8 px-3 flex items-center gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                Retry Push
              </Button>
              <span className="text-[10px] text-zinc-500">
                Or scroll down and use manual Auto-Fix to download ZIP
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── CANCELLED PHASE ─────────────────────────────────────
  if (phase === 'cancelled') {
    return (
      <div className="rounded-xl border border-zinc-700/40 bg-zinc-800/20 p-5 mb-6">
        <div className="flex items-start gap-3">
          <X className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-zinc-300">
              Auto-push cancelled
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              You can trigger fixes and push manually using the options below.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
