// components/scans/DownloadReportButton.tsx
// KAVACH — Download scan report button
// Free:       Markdown only (basic)
// Pro:        Markdown (detailed) + JSON
// Enterprise: All above + SARIF

'use client'

import * as React from 'react'
import { Download, FileText, FileJson, FileCode, Lock, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface DownloadReportButtonProps {
  scanId: string
  userPlan: 'free' | 'pro' | 'enterprise'
}

type Format = 'markdown' | 'json' | 'sarif'

export function DownloadReportButton({ scanId, userPlan }: DownloadReportButtonProps) {
  const { toast } = useToast()
  const [downloading, setDownloading] = React.useState<Format | null>(null)

  const isPro = userPlan === 'pro' || userPlan === 'enterprise'
  const isEnterprise = userPlan === 'enterprise'

  const handleDownload = async (format: Format) => {
    // Tier gate: JSON needs Pro+
    if (format === 'json' && !isPro) {
      toast({
        title: '💎 Pro Feature',
        description: 'JSON export is available on Pro and Enterprise plans.',
      })
      return
    }

    // Tier gate: SARIF needs Enterprise
    if (format === 'sarif' && !isEnterprise) {
      toast({
        title: '🏢 Enterprise Feature',
        description: 'SARIF export is available on Enterprise plans only.',
      })
      return
    }

    setDownloading(format)

    try {
      const res = await fetch(`/api/scans/${scanId}/report/download?format=${format}`)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to download report')
      }

      // Get filename from Content-Disposition header
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch?.[1] ?? `KAVACH-report-${scanId.slice(0, 8)}.${format}`

      // Trigger download
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: '✅ Report Downloaded',
        description: `Saved as ${filename}`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed'
      toast({
        title: '❌ Download Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setDownloading(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={downloading !== null}
        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-zinc-200 dark:border-[#1f1f1f] text-zinc-300 hover:bg-white/5 bg-transparent h-9 px-3"
      >
        {downloading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Downloading...
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Report
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 bg-zinc-900 border-zinc-700 text-zinc-100"
      >
        {/* Markdown — Free (basic) / Pro/Enterprise (detailed) */}
        <DropdownMenuItem
          onClick={() => handleDownload('markdown')}
          className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800"
        >
          <FileText className="h-4 w-4 mr-2 text-emerald-400" />
          <div className="flex-1">
            <div className="text-sm">Markdown (.md)</div>
            <div className="text-[10px] text-zinc-500">
              {isPro ? 'Detailed report' : 'Basic report'}
            </div>
          </div>
          {downloading === 'markdown' && <Loader2 className="h-3 w-3 animate-spin" />}
        </DropdownMenuItem>

        {/* JSON — Pro + Enterprise */}
        <DropdownMenuItem
          onClick={() => handleDownload('json')}
          className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800"
        >
          <FileJson className="h-4 w-4 mr-2 text-amber-400" />
          <div className="flex-1">
            <div className="text-sm flex items-center gap-1.5">
              JSON (.json)
              {!isPro && <Lock className="h-3 w-3 text-zinc-500" />}
            </div>
            <div className="text-[10px] text-zinc-500">
              {isPro ? 'Machine-readable' : 'Pro required'}
            </div>
          </div>
          {downloading === 'json' && <Loader2 className="h-3 w-3 animate-spin" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-zinc-700" />

        {/* SARIF — Enterprise only */}
        <DropdownMenuItem
          onClick={() => handleDownload('sarif')}
          className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800"
        >
          <FileCode className="h-4 w-4 mr-2 text-purple-400" />
          <div className="flex-1">
            <div className="text-sm flex items-center gap-1.5">
              SARIF (.sarif)
              {!isEnterprise && <Lock className="h-3 w-3 text-zinc-500" />}
            </div>
            <div className="text-[10px] text-zinc-500">
              {isEnterprise ? 'GitHub / VS Code compatible' : 'Enterprise required'}
            </div>
          </div>
          {downloading === 'sarif' && <Loader2 className="h-3 w-3 animate-spin" />}
        </DropdownMenuItem>

        {!isPro && (
          <>
            <DropdownMenuSeparator className="bg-zinc-700" />
            <div className="px-2 py-2 text-[10px] text-zinc-500">
              💎 Upgrade to Pro for JSON + detailed Markdown reports
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
