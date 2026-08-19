// components/scans/AutoFixButton.tsx
'use client'

import * as React from 'react'
import {
  Zap,
  Lock,
  Loader2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Shield,
  RotateCcw,
  Download,
  Eye,
  GitPullRequest,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

// ── Types ──────────────────────────────────────────────────

export interface FixJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress_percentage: number
  progress_message: string
  fixed_count: number
  skipped_count: number
  failed_count: number
  total_vulns: number
  fixed_files: FixedFile[]
  error_message?: string
}

export interface FixedFile {
  file_path: string
  original_content: string
  fixed_content: string
  status: 'fixed' | 'skipped' | 'failed'
  vulnerabilities_fixed: string[]
  lines_changed: number
  skip_reason?: string
  confidence?: import('@/types').ConfidenceScore   // V2.2
}

interface AutoFixButtonProps {
  scanId:            string
  userPlan:          'free' | 'pro' | 'enterprise'
  vulnerabilityIds:  string[]
  vulnerabilityCount: number
  onFixComplete:     (fixJob: FixJob) => void
  onViewDiff?:       (fixJob: FixJob) => void   // V2.2 — reopen diff viewer
  onCreatePR?:       (fixJob: FixJob) => void   // V2.2 — open PR modal (Enterprise)
}

// ── Component ──────────────────────────────────────────────

export function AutoFixButton({
  scanId,
  userPlan,
  vulnerabilityIds,
  vulnerabilityCount,
  onFixComplete,
  onViewDiff,
  onCreatePR,
}: AutoFixButtonProps) {
  const { toast } = useToast()

  const [phase, setPhase] = React.useState<
    'idle' | 'confirming' | 'running' | 'done' | 'error'
  >('idle')
  const [fixJob,     setFixJob]     = React.useState<FixJob | null>(null)
  const [errorMsg,   setErrorMsg]   = React.useState('')
  const [downloading, setDownloading] = React.useState(false)
  const pollRef = React.useRef<NodeJS.Timeout | null>(null)

  const isPro   = userPlan === 'pro' || userPlan === 'enterprise'
  const noVulns = vulnerabilityCount === 0

  // ── Cleanup polling on unmount ─────────────────────────
  React.useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // ── Poll fix job status ────────────────────────────────
  const startPolling = React.useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/scans/${scanId}/auto-fix`)
        const data = await res.json()

        if (!data.fixJob) return

        const job: FixJob = data.fixJob
        setFixJob(job)

        if (job.status === 'completed') {
          clearInterval(pollRef.current!)
          setPhase('done')
          onFixComplete(job)
          toast({
            title: `✅ Auto-Fix Complete`,
            description: `Fixed ${job.fixed_count} files successfully.`,
          })
        } else if (job.status === 'failed') {
          clearInterval(pollRef.current!)
          setPhase('error')
          setErrorMsg(job.error_message ?? 'Fix job failed')
          toast({
            title: 'Auto-Fix Failed',
            description: job.error_message ?? 'Something went wrong.',
            variant: 'destructive',
          })
        }
      } catch {
        // Network blip — keep polling
      }
    }, 2500)
  }, [scanId, onFixComplete, toast])

  // ── Start fix job ──────────────────────────────────────
  const handleStartFix = React.useCallback(async () => {
    setPhase('running')
    setErrorMsg('')

    try {
      const res = await fetch(`/api/scans/${scanId}/auto-fix`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:           'start',
          vulnerabilityIds,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.upgradeRequired) {
          setPhase('idle')
          toast({
            title:       'Pro Required',
            description: 'Upgrade to Pro to use Auto-Fix.',
            variant:     'destructive',
          })
          return
        }
        if (data.error === 'files_expired') {
          setPhase('error')
          setErrorMsg('File contents have expired. Please rescan to use Auto-Fix.')
          return
        }
        throw new Error(data.error ?? 'Failed to start fix job')
      }

      toast({
        title:       '🔧 Auto-Fix Started',
        description: 'KAVACH AI is fixing your vulnerabilities...',
      })

      startPolling()

    } catch (err) {
      setPhase('error')
      const errorMessage = err instanceof Error ? err.message : 'Failed to start auto-fix'
      setErrorMsg(errorMessage)
      toast({
        title:       'Error',
        description: errorMessage,
        variant:     'destructive',
      })
    }
  }, [scanId, vulnerabilityIds, startPolling, toast])

  // ── Download ZIP of fixed files ────────────────────────
  const handleDownloadZip = React.useCallback(async () => {
    setDownloading(true)
    try {
      const res = await fetch(`/api/scans/${scanId}/auto-fix/download`)

      if (!res.ok) {
        // Try to parse error JSON
        let errorMessage = 'Failed to download fixes'
        try {
          const data = await res.json()
          errorMessage = data.message ?? data.error ?? errorMessage
        } catch {
          // Response wasn't JSON
        }
        throw new Error(errorMessage)
      }

      // Get the blob and trigger browser download
      const blob = await res.blob()
      const url  = window.URL.createObjectURL(blob)
      const a    = document.createElement('a')

      // Extract filename from Content-Disposition, else fallback
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match       = disposition.match(/filename="?([^"]+)"?/)
      const filename    = match?.[1] ?? `kavach-fixes-${scanId.slice(0, 8)}.zip`

      a.href     = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title:       '📦 Download Started',
        description: `${filename} — check your downloads folder.`,
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed'
      toast({
        title:       'Download Failed',
        description: errorMessage,
        variant:     'destructive',
      })
    } finally {
      setDownloading(false)
    }
  }, [scanId, toast])

  // ── Reset ──────────────────────────────────────────────
  const handleReset = () => {
    setPhase('idle')
    setFixJob(null)
    setErrorMsg('')
    if (pollRef.current) clearInterval(pollRef.current)
  }

  // ── FREE USER — show upgrade prompt ────────────────────
  if (!isPro) {
    return (
      <Button
        variant="outline"
        disabled={noVulns}
        className="w-full flex items-center justify-center gap-2 border-zinc-600 text-zinc-400 cursor-not-allowed opacity-60"
        onClick={() => {
          toast({
            title:       '💎 Pro Feature',
            description: 'Upgrade to Pro to auto-fix vulnerabilities instantly.',
          })
        }}
      >
        <Lock className="h-4 w-4" />
        Auto-Fix (Pro)
      </Button>
    )
  }

  // ── NO VULNERABILITIES ─────────────────────────────────
  if (noVulns) {
    return null
  }

  // ── IDLE — show fix button ─────────────────────────────
  if (phase === 'idle') {
    return (
      <Button
        onClick={() => setPhase('confirming')}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-medium shadow-lg shadow-purple-500/20"
      >
        <Zap className="h-4 w-4" />
        Auto-Fix All
        <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
          {vulnerabilityCount}
        </span>
      </Button>
    )
  }

  // ── CONFIRMING — show confirmation dialog inline ───────
  if (phase === 'confirming') {
    return (
      <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-purple-500/30 bg-purple-600/10 px-4 py-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-purple-400 shrink-0" />
          <span className="text-sm text-zinc-300">
            Fix <strong className="text-white">{vulnerabilityCount}</strong> issues?
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            className="h-7 text-zinc-400 hover:text-zinc-200 text-xs px-2"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleStartFix}
            className="h-7 bg-purple-600 hover:bg-purple-500 text-white text-xs px-3"
          >
            Yes
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    )
  }

  // ── RUNNING — show progress ────────────────────────────
  if (phase === 'running') {
    const pct = fixJob?.progress_percentage ?? 0
    const msg = fixJob?.progress_message    ?? 'Starting...'

    return (
      <div className="flex w-full items-center gap-3 rounded-lg border border-purple-500/30 bg-purple-600/10 px-4 py-2">
        <Loader2 className="h-4 w-4 text-purple-400 animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-400 truncate">{msg}</span>
            <span className="text-xs text-purple-400 font-mono ml-2">{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // ── DONE — show results + download button + view diff + PR ─────
  if (phase === 'done' && fixJob) {
    const hasDownloadableFiles = fixJob.fixed_count > 0
    const isEnterprise = userPlan === 'enterprise'

    return (
      <div className="w-full space-y-2">
        {/* View Diff button — explicit and prominent (V2.2) */}
        {hasDownloadableFiles && onViewDiff && (
          <Button
            onClick={() => onViewDiff(fixJob)}
            variant="outline"
            className="w-full flex items-center justify-center gap-2 border-zinc-700 hover:bg-white/5 text-zinc-300"
          >
            <Eye className="h-4 w-4" />
            View Diff & Confidence Scores
          </Button>
        )}

        {/* Download ZIP button */}
        {hasDownloadableFiles && (
          <Button
            onClick={handleDownloadZip}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium shadow-lg shadow-emerald-500/20"
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing ZIP...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Fixed Files (ZIP)
                <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                  {fixJob.fixed_count}
                </span>
              </>
            )}
          </Button>
        )}

        {/* Push to GitHub PR button — Enterprise only (V2.2) */}
        {hasDownloadableFiles && isEnterprise && onCreatePR && (
          <Button
            onClick={() => onCreatePR(fixJob)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white font-medium shadow-lg shadow-purple-500/20"
          >
            <GitPullRequest className="h-4 w-4" />
            Push to GitHub PR
            <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
              {fixJob.fixed_count}
            </span>
          </Button>
        )}
      </div>
    )
  }

  // ── ERROR ──────────────────────────────────────────────
  if (phase === 'error') {
    // Special privacy message for expired file contents
    if (errorMsg === 'File contents have expired. Please rescan to use Auto-Fix.') {
      return (
        <div className="w-full rounded-lg border border-zinc-700/50 bg-zinc-800/50 px-4 py-3">
          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-200">
                Source files removed for your privacy
              </p>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                KAVACH automatically removes source code from our servers 
                after 48 hours. Your scan report and vulnerability details 
                are still available.
              </p>
              <a
                href="/scans/new"
                className="inline-flex items-center gap-1.5 mt-2 text-xs 
                           font-medium text-blue-400 hover:text-blue-300 
                           transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Rescan to use Auto-Fix
              </a>
            </div>
          </div>
        </div>
      )
    }

    // Default error UI for all other errors
    return (
      <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-red-500/30 bg-red-600/10 px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <XCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span className="text-xs text-red-300 truncate">{errorMsg}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleReset}
          className="ml-1 h-7 text-zinc-400 hover:text-zinc-200 text-xs px-2 shrink-0"
        >
          Retry
        </Button>
      </div>
    )
  }

  return null
}
