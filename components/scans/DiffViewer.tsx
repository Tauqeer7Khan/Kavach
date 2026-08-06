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
          <span className="text-[10px] text-zinc-500 ml-2 shrink-0">
            {changedLines} lines changed
          </span>
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
    } catch (err: any) {
      toast({
        title:       'Download Failed',
        description: err.message,
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
            <div className="text-center py-12 text-zinc-500">
              No files were processed.
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
        vulnsCount={fixJob.total_vulns}
      />
    )}
    </>
  )
}
