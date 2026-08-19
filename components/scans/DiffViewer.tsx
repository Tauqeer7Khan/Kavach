// components/scans/DiffViewer.tsx
'use client'

import * as React from 'react'
import {
  Download,
  FileCode2,
  CheckCircle2,
  XCircle,
  SkipForward,
  ChevronDown,
  ChevronRight,
  Loader2,
  GitPullRequest,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { translateFixError } from '@/lib/fix-error-messages'
import { CreatePRModal } from './CreatePRModal'
import type { FixJob, FixedFile } from './AutoFixButton'

// ── Props ──────────────────────────────────────────────────

interface DiffViewerProps {
  isOpen:   boolean
  onClose:  () => void
  fixJob:   FixJob
  scanId:   string
  userPlan: 'free' | 'pro' | 'enterprise'
  repoUrl?: string
}

// ── Inline diff computation ────────────────────────────────

interface DiffLine {
  type:    'same' | 'added' | 'removed'
  content: string
  lineNo:  number | null
}

function computeDiff(original: string, fixed: string): DiffLine[] {
  const origLines  = original.split('\n')
  const fixedLines = fixed.split('\n')
  const result: DiffLine[] = []

  const maxLen = Math.max(origLines.length, fixedLines.length)

  for (let i = 0; i < maxLen; i++) {
    const o = origLines[i]
    const f = fixedLines[i]

    if (o === undefined) {
      result.push({ type: 'added',   content: f,  lineNo: i + 1 })
    } else if (f === undefined) {
      result.push({ type: 'removed', content: o,  lineNo: i + 1 })
    } else if (o !== f) {
      result.push({ type: 'removed', content: o,  lineNo: i + 1 })
      result.push({ type: 'added',   content: f,  lineNo: null  })
    } else {
      result.push({ type: 'same',    content: o,  lineNo: i + 1 })
    }
  }

  return result
}

// ── Confidence badge (V2.2) ────────────────────────────────

function ConfidenceBadge({ 
  confidence 
}: { 
  confidence: NonNullable<FixedFile['confidence']> 
}) {
  const bandStyles = {
    high: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      dot: 'bg-emerald-500',
    },
    medium: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      dot: 'bg-yellow-500',
    },
    low: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      dot: 'bg-orange-500',
    },
    very_low: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      dot: 'bg-red-500',
    },
  }

  const styles = bandStyles[confidence.band]

  return (
    <div className={`flex items-center gap-2 rounded-md ${styles.bg} border ${styles.border} px-2.5 py-1`}>
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      <span className={`text-[10px] font-semibold ${styles.text}`}>
        {confidence.overall}% {confidence.label}
      </span>
    </div>
  )
}

// ── File card ──────────────────────────────────────────────

function FileCard({ file }: { file: FixedFile }) {
  const [expanded, setExpanded] = React.useState(
    file.status === 'fixed'
  )

  const COLOR_MAP = {
    skipped: {
      title:   'text-amber-400',
      icon:    'amber',
      pillTxt: 'text-amber-500/80',
    },
    failed: {
      title:   'text-red-400',
      icon:    'red',
      pillTxt: 'text-red-500/80',
    },
  } as const

  const diff      = React.useMemo(
    () => computeDiff(file.original_content, file.fixed_content),
    [file.original_content, file.fixed_content]
  )
  const changedLines = diff.filter(d => d.type !== 'same').length

  const statusIcon = {
    fixed:   <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    skipped: <SkipForward  className="h-4 w-4 text-amber-400"   />,
    failed:  <XCircle      className="h-4 w-4 text-red-400"     />,
  }[file.status]

  const statusColor = {
    fixed:   'border-emerald-500/20 bg-emerald-500/5',
    skipped: 'border-amber-500/20   bg-amber-500/5',
    failed:  'border-red-500/20     bg-red-500/5',
  }[file.status]

  return (
    <div className={`rounded-lg border ${statusColor} overflow-hidden`}>
      {/* File header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        {expanded
          ? <ChevronDown  className="h-4 w-4 text-zinc-500 shrink-0" />
          : <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
        }
        <FileCode2 className="h-4 w-4 text-zinc-400 shrink-0" />
        <span className="text-sm font-mono text-zinc-300 flex-1 truncate">
          {file.file_path}
        </span>
        {statusIcon}
        {file.status === 'fixed' && (
          <>
            <span className="text-[10px] text-zinc-500 ml-2 shrink-0">
              {changedLines} lines changed
            </span>
            {file.confidence && (
              <div className="ml-2 shrink-0">
                <ConfidenceBadge confidence={file.confidence} />
              </div>
            )}
          </>
        )}
        {(file.status === 'skipped' || file.status === 'failed') && (() => {
          const friendly = translateFixError(file.skip_reason)
          const colorObj = COLOR_MAP[file.status as 'skipped' | 'failed']
          return (
            <span className={`text-[10px] ${colorObj.pillTxt} ml-2 shrink-0 max-w-[220px] truncate`}>
              {friendly.title}
            </span>
          )
        })()}
      </button>

      {/* Confidence details (V2.2) */}
      {expanded && file.status === 'fixed' && file.confidence && (
        <div className="border-t border-white/5 bg-zinc-950/30 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-300">
                  🎯 Fix Confidence: {file.confidence.overall}%
                </p>
                <ConfidenceBadge confidence={file.confidence} />
              </div>
              <p className="text-[11px] text-zinc-400">
                {file.confidence.recommendation}
              </p>

              {/* Factor breakdown — collapsible */}
              <details className="group">
                <summary className="text-[10px] text-zinc-500 cursor-pointer hover:text-zinc-400 select-none">
                  Show scoring breakdown
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="flex justify-between px-2 py-1 rounded bg-zinc-900/50">
                    <span className="text-zinc-500">Vuln type match</span>
                    <span className="font-mono text-zinc-300">{file.confidence.factors.vuln_type_match}</span>
                  </div>
                  <div className="flex justify-between px-2 py-1 rounded bg-zinc-900/50">
                    <span className="text-zinc-500">Fix size</span>
                    <span className="font-mono text-zinc-300">{file.confidence.factors.fix_size}</span>
                  </div>
                  <div className="flex justify-between px-2 py-1 rounded bg-zinc-900/50">
                    <span className="text-zinc-500">Detection consensus</span>
                    <span className="font-mono text-zinc-300">{file.confidence.factors.detection_consensus}</span>
                  </div>
                  <div className="flex justify-between px-2 py-1 rounded bg-zinc-900/50">
                    <span className="text-zinc-500">Code complexity</span>
                    <span className="font-mono text-zinc-300">{file.confidence.factors.code_complexity}</span>
                  </div>
                  <div className="flex justify-between px-2 py-1 rounded bg-zinc-900/50">
                    <span className="text-zinc-500">Test coverage</span>
                    <span className="font-mono text-zinc-300">{file.confidence.factors.test_coverage_hint}</span>
                  </div>
                  <div className="flex justify-between px-2 py-1 rounded bg-zinc-900/50">
                    <span className="text-zinc-500">AI self-rating</span>
                    <span className="font-mono text-zinc-300">{file.confidence.factors.ai_self_rating}</span>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Diff content */}
      {expanded && file.status === 'fixed' && (
        <div className="border-t border-white/5 overflow-x-auto">
          <table className="w-full text-[11px] font-mono">
            <tbody>
              {diff.map((line, idx) => {
                if (line.type === 'same') return null
                return (
                  <tr
                    key={idx}
                    className={
                      line.type === 'added'
                        ? 'bg-emerald-500/10'
                        : 'bg-red-500/10'
                    }
                  >
                    <td className="w-10 px-2 py-0.5 text-right text-zinc-600 select-none border-r border-white/5">
                      {line.lineNo ?? ''}
                    </td>
                    <td className="w-5 px-1 py-0.5 text-center select-none">
                      <span className={
                        line.type === 'added'
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      }>
                        {line.type === 'added' ? '+' : '-'}
                      </span>
                    </td>
                    <td className="px-2 py-0.5 whitespace-pre text-zinc-300">
                      {line.content}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Skipped/Failed explanation with friendly messaging */}
      {expanded && file.status !== 'fixed' && (() => {
        const friendly = translateFixError(file.skip_reason)
        const isSkipped = file.status === 'skipped'
        const colorObj = COLOR_MAP[file.status as 'skipped' | 'failed']
        const icon = isSkipped ? '⏭️' : '❌'

        return (
          <div className="border-t border-white/5 px-4 py-4 space-y-2.5">
            {/* Title with icon */}
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${colorObj.title}`}>
                  {friendly.title}
                </p>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  {friendly.message}
                </p>
              </div>
            </div>

            {/* Suggestion box */}
            <div className="ml-6 flex items-start gap-2 rounded-md bg-indigo-500/10 border border-indigo-500/25 px-3 py-2">
              <span className="text-xs text-indigo-300 leading-relaxed">
                💡 <strong>Suggestion:</strong> {friendly.suggestion}
              </span>
            </div>

            {/* Raw reason — collapsible for debugging */}
            {file.skip_reason && (
              <details className="ml-6 group">
                <summary className="text-[10px] text-zinc-600 cursor-pointer hover:text-zinc-400 select-none">
                  Show technical details
                </summary>
                <p className="mt-1 text-[10px] text-zinc-500 font-mono bg-zinc-950/50 px-2 py-1.5 rounded border border-zinc-800/50">
                  {file.skip_reason}
                </p>
              </details>
            )}
          </div>
        )
      })()}
    </div>
  )
}

// ── Main DiffViewer ────────────────────────────────────────

export function DiffViewer({ isOpen, onClose, fixJob, scanId, userPlan, repoUrl }: DiffViewerProps) {
  const { toast }           = useToast()
  const [downloading, setDownloading] = React.useState(false)
  const [showPRModal, setShowPRModal] = React.useState(false)

  const fixedFiles   = fixJob.fixed_files ?? []
  const successCount = fixedFiles.filter(f => f.status === 'fixed').length
  const skippedCount = fixedFiles.filter(f => f.status === 'skipped').length
  const failedCount  = fixedFiles.filter(f => f.status === 'failed').length

  const handleDownloadZip = async () => {
    setDownloading(true)
    try {
      const res = await fetch(
        `/api/scans/${scanId}/auto-fix/download?fixJobId=${fixJob.id}`
      )

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Download failed')
      }

      const blob     = await res.blob()
      const url      = URL.createObjectURL(blob)
      const a        = document.createElement('a')
      const dateStr  = new Date().toISOString().split('T')[0]
      a.href         = url
      a.download     = `kavach-fixes-${scanId.slice(0, 8)}-${dateStr}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title:       '📦 Download Started',
        description: 'Your fixed files are downloading.',
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
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose() }}>
        <DialogContent
        className="sm:max-w-4xl w-full bg-zinc-900 border border-zinc-700/60 text-zinc-100 shadow-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-700/60 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-semibold text-zinc-100">
                Auto-Fix Results
              </DialogTitle>
              <p className="text-xs text-zinc-400 mt-1">
                Review the changes KAVACH AI made to your code
              </p>
            </div>
            {/* Summary pills */}
            <div className="flex items-center gap-2">
              {successCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-3 py-1 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  {successCount} fixed
                </span>
              )}
              {skippedCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/25 px-3 py-1 text-xs text-amber-400 font-medium">
                  <SkipForward className="h-3 w-3" />
                  {skippedCount} skipped
                </span>
              )}
              {failedCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/25 px-3 py-1 text-xs text-red-400 font-medium">
                  <XCircle className="h-3 w-3" />
                  {failedCount} failed
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* File list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
          {fixedFiles.length === 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 mx-2">
              <Shield className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  Fixed files removed for your privacy
                </p>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  KAVACH automatically removes code diffs after 7 days. 
                  Your fix summary is still available above.
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  To generate new fixes, rescan your code and run 
                  Auto-Fix again.
                </p>
              </div>
            </div>
          )}
          {fixedFiles.map((file, idx) => (
            <FileCard key={idx} file={file} />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-700/60 flex items-center justify-between flex-shrink-0 bg-zinc-900">
          <p className="text-xs text-zinc-500">
            ⚠️ Review all changes carefully before deploying to production.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            >
              Close
            </Button>
            {userPlan === 'enterprise' && successCount > 0 && (
              <Button
                onClick={() => setShowPRModal(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2"
              >
                <GitPullRequest className="h-4 w-4" />
                Push to GitHub PR
              </Button>
            )}
            {successCount > 0 && (
              <Button
                onClick={handleDownloadZip}
                disabled={downloading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2"
              >
                {downloading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />
                }
                Download Fixed Files (.zip)
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    {showPRModal && (
      <CreatePRModal
        isOpen={showPRModal}
        onClose={() => setShowPRModal(false)}
        scanId={scanId}
        fixJobId={fixJob.id}
        repoUrl={repoUrl}
        filesCount={successCount}
      />
    )}
    </>
  )
}
