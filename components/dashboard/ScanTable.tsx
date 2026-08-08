'use client'

import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Eye, RotateCcw } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanStatus =
  | 'queued' | 'downloading' | 'scanning'
  | 'analyzing' | 'scoring' | 'completed' | 'failed' | 'cancelled'

interface Scan {
  id: string
  project_id: string | null
  status: ScanStatus
  security_score: number | null
  grade: string | null
  total_vulnerabilities: number | null
  critical_count: number | null
  high_count: number | null
  created_at: string
  projects?: { name: string } | null
}

interface ScanTableProps {
  scans: Scan[]
  isLoading?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return 'text-zinc-600 dark:text-zinc-400'
  if (score >= 80) return 'text-green-400'
  if (score >= 70) return 'text-yellow-400'
  if (score >= 50) return 'text-orange-400'
  return 'text-red-400'
}

function statusBadge(status: ScanStatus): JSX.Element {
  const map: Record<ScanStatus, { label: string; class: string }> = {
    queued:      { label: 'Queued',     class: 'bg-zinc-700 text-zinc-300' },
    downloading: { label: 'Preparing',  class: 'bg-blue-500/20 text-blue-400' },
    scanning:    { label: 'Scanning',   class: 'bg-indigo-500/20 text-indigo-400 animate-pulse' },
    analyzing:   { label: 'Analyzing',  class: 'bg-purple-500/20 text-purple-400 animate-pulse' },
    scoring:     { label: 'Scoring',    class: 'bg-violet-500/20 text-violet-400 animate-pulse' },
    completed:   { label: 'Complete',   class: 'bg-green-500/20 text-green-400' },
    failed:      { label: 'Failed',     class: 'bg-red-500/20 text-red-400' },
    cancelled:   { label: 'Cancelled',  class: 'bg-zinc-500/20 text-zinc-400' },
  }
  const cfg = map[status] || map.failed
  return <Badge className={`text-xs font-medium border-0 ${cfg.class}`}>{cfg.label}</Badge>
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScanTable({ scans, isLoading = false }: ScanTableProps) {
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full bg-white dark:bg-[#111111]" />
        ))}
      </div>
    )
  }

  if (scans.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500 dark:text-zinc-500">
        No scans yet. Start your first scan!
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-[#1f1f1f] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-200 dark:border-[#1f1f1f] hover:bg-transparent">
            <TableHead className="text-zinc-600 dark:text-zinc-400">Project</TableHead>
            <TableHead className="text-zinc-600 dark:text-zinc-400 hidden md:table-cell">Date</TableHead>
            <TableHead className="text-zinc-600 dark:text-zinc-400">Score</TableHead>
            <TableHead className="text-zinc-600 dark:text-zinc-400 hidden md:table-cell">Issues</TableHead>
            <TableHead className="text-zinc-600 dark:text-zinc-400">Status</TableHead>
            <TableHead className="text-zinc-600 dark:text-zinc-400 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scans.map(scan => (
            <TableRow
              key={scan.id}
              className="border-zinc-200 dark:border-[#1f1f1f] hover:bg-white/[0.02] cursor-pointer"
              onClick={() => router.push(`/scans/${scan.id}`)}
            >
              {/* Project name */}
              <TableCell className="font-medium text-zinc-900 dark:text-white">
                {scan.projects?.name ?? 'Untitled Project'}
              </TableCell>

              {/* Date */}
              <TableCell className="text-zinc-600 dark:text-zinc-400 text-sm hidden md:table-cell">
                {formatDate(scan.created_at)}
              </TableCell>

              {/* Score */}
              <TableCell>
                {scan.security_score !== null ? (
                  <span className={`font-bold ${scoreColor(scan.security_score)}`}>
                    {scan.security_score}
                    <span className="text-zinc-600 text-xs ml-1">/ 100</span>
                  </span>
                ) : (
                  <span className="text-zinc-600 text-sm">—</span>
                )}
              </TableCell>

              {/* Issues */}
              <TableCell className="hidden md:table-cell">
                {scan.total_vulnerabilities !== null ? (
                  <div className="flex items-center gap-2 text-xs">
                    {(scan.critical_count ?? 0) > 0 && (
                      <span className="text-red-400">
                        {scan.critical_count} critical
                      </span>
                    )}
                    <span className="text-zinc-500 dark:text-zinc-500">
                      {scan.total_vulnerabilities} total
                    </span>
                  </div>
                ) : (
                  <span className="text-zinc-600 text-sm">—</span>
                )}
              </TableCell>

              {/* Status */}
              <TableCell>{statusBadge(scan.status)}</TableCell>

              {/* Actions */}
              <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:text-white hover:bg-white/5"
                    onClick={() => router.push(`/scans/${scan.id}`)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:text-white hover:bg-white/5"
                    onClick={() => router.push('/scans/new')}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
