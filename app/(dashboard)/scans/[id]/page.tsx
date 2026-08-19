'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import {
  Shield, RotateCcw, Share2, AlertOctagon,
  AlertTriangle, Info, XCircle, Search,
} from 'lucide-react'
import { AiFixPromptModal } from '@/components/scans/AiFixPromptModal'
import { AutoFixButton, type FixJob } from '@/components/scans/AutoFixButton'
import { AutoPushFlow }               from '@/components/scans/AutoPushFlow'
import { FixActionsCard }             from '@/components/scans/FixActionsCard'
import { DiffViewer }                 from '@/components/scans/DiffViewer'
import { DownloadReportButton }       from '@/components/scans/DownloadReportButton'
import { CreatePRModal }              from '@/components/scans/CreatePRModal'
import { detectLanguage, type ScanReportForPrompt } from '@/lib/prompt-generator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SecurityScore from '@/components/dashboard/SecurityScore'
import ScanProgress from '@/components/dashboard/ScanProgress'
import VulnerabilityCard from '@/components/dashboard/VulnerabilityCard'
import { createClient } from '@/lib/supabase-client'

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanStatus =
  | 'queued' | 'downloading' | 'scanning'
  | 'analyzing' | 'scoring' | 'completed' | 'failed' | 'cancelled'

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'

interface Vulnerability {
  id: string
  vuln_code: string
  name: string
  description: string
  severity: Severity
  owasp_category: string | null
  owasp_id: string | null
  file_path: string | null
  line_number: number | null
  vulnerable_code: string | null
  fixed_code: string | null
  ai_explanation: string | null
  ai_fix_explanation: string | null
  why_ai_makes_this_mistake: string | null
  detection_method: string
  is_fixed?: boolean
  is_false_positive?: boolean
}

interface ScanReport {
  id: string
  status: ScanStatus
  security_score: number | null
  grade: string | null
  total_vulnerabilities: number | null
  critical_count: number | null
  high_count: number | null
  medium_count: number | null
  low_count: number | null
  info_count: number | null
  files_scanned: number | null
  lines_scanned: number | null
  progress_percentage: number
  progress_message: string | null
  queue_position: number | null
  error_message: string | null
  created_at: string
  projects?: {
    name: string | null
    repo_url: string | null
  } | null
  vulnerabilities?: Vulnerability[]
  auto_push_enabled?: boolean
  push_repo_url?: string | null
  push_repo_owner?: string | null
  push_repo_name?: string | null
}

// ─── Status title helper ──────────────────────────────────────────────────────

function getStatusTitle(status: ScanStatus): string {
  const titles: Record<ScanStatus, string> = {
    queued:      'Your scan is in queue',
    downloading: 'Downloading your code...',
    scanning:    'Running security checks...',
    analyzing:   'AI is analyzing your code...',
    scoring:     'Generating your report...',
    completed:   'Scan Complete',
    failed:      'Scan Failed',
    cancelled:   'Scan Cancelled',
  }
  return titles[status]
}

// ─── Severity card data ───────────────────────────────────────────────────────

const SEVERITY_CARDS = [
  { key: 'critical_count', label: 'Critical', color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',    icon: AlertOctagon },
  { key: 'high_count',     label: 'High',     color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: AlertTriangle },
  { key: 'medium_count',   label: 'Medium',   color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: AlertTriangle },
  { key: 'low_count',      label: 'Low',      color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: Info },
] as const

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ScanDetailPage() {
  const params  = useParams()
  const router  = useRouter()
  const scanId  = params.id as string
  const supabase = createClient()

  const [report, setReport]           = useState<ScanReport | null>(null)
  const [isLoading, setIsLoading]     = useState<boolean>(true)
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [search, setSearch]           = useState<string>('')
  const [copied, setCopied]           = useState<boolean>(false)
  const [showPromptModal, setShowPromptModal] = useState<boolean>(false)
  const [fixJob,          setFixJob]          = useState<FixJob | null>(null)
  const [showDiffViewer,  setShowDiffViewer]  = useState(false)
  const [showPRModal,     setShowPRModal]     = useState(false)   // V2.2

  // V2.2 — Reset handler for "Reset" button in FixActionsCard heading
  const handleResetFix = () => {
    setFixJob(null)
    setShowDiffViewer(false)
    setShowPRModal(false)
  }
  const [userPlan,        setUserPlan]        = useState<'free'|'pro'|'enterprise'>('free')
  const [isCancelling,    setIsCancelling]    = useState(false)
  const { toast } = useToast()

  // ── Fetch report ─────────────────────────────────────────────────────────

  const fetchReport = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/scan/${scanId}/report`)
      if (!res.ok) {
        console.error('Report fetch failed:', res.status)
        return
      }
      const json = await res.json() as { success: boolean; scan: ScanReport; vulnerabilities?: Vulnerability[] }
      console.log('[Scan Page] Report response:', json)

      if (!json.success || !json.scan) {
        console.error('[Scan Page] Invalid report response')
        return
      }

      setReport({
        ...json.scan,
        vulnerabilities: json.vulnerabilities ?? [],
      })
    } catch (err) {
      console.error('Fetch report error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [scanId])

  const fetchStatus = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/scan/${scanId}`)
      if (!res.ok) {
        console.error('Scan fetch failed:', res.status)
        setIsLoading(false)
        return
      }
      const json = await res.json() as { success: boolean; scan: ScanReport }
      console.log('[Scan Page] Status response:', json)

      if (!json.success || !json.scan) {
        console.error('[Scan Page] Invalid response structure')
        setIsLoading(false)
        return
      }

      const data = json.scan
      setReport(prev => prev ? { ...prev, ...data } : data)

      if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
        if (data.status === 'completed') {
          await fetchReport()
        }
      }
    } catch (err) {
      console.error('Fetch status error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [scanId, fetchReport])

  // ── Polling + Realtime ────────────────────────────────────────────────────

  useEffect(() => {
    console.log('[Scan Page] scanId:', scanId)
    console.log('[Scan Page] Starting fetch...')
    
    // Fetch user plan for tier check
    const fetchUserPlan = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: userData } = await supabase
          .from('users')
          .select('plan')
          .eq('id', user.id)
          .single()
        if (userData?.plan) {
          setUserPlan(userData.plan as 'free' | 'pro' | 'enterprise')
        }
      } catch {}
    }
    fetchUserPlan()

    let stopped = false
    void fetchStatus()

    const interval = setInterval(() => {
      if (stopped) return
      void fetchStatus()
    }, 3000)

    // Supabase Realtime
    const channel = supabase
      .channel(`scan-page-${scanId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'scans',
        filter: `id=eq.${scanId}`,
      }, (payload: { new: Record<string, unknown> }) => {
        const row = payload.new
        setReport(prev => prev ? { ...prev, ...row } as ScanReport : null)
        if (row.status === 'completed' || row.status === 'failed' || row.status === 'cancelled') {
          stopped = true
          clearInterval(interval)
          if (row.status === 'completed') {
            void fetchReport()
          }
        }
      })
      .subscribe()

    return () => {
      stopped = true
      clearInterval(interval)
      void supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId])

  // ── Share handler ─────────────────────────────────────────────────────────

  const handleShare = async (): Promise<void> => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Cancel handler ────────────────────────────────────────────────────────

  const handleCancel = async () => {
    setIsCancelling(true)
    try {
      const res = await fetch(`/api/scans/${scanId}/cancel`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to cancel scan')
      }
      toast({ title: 'Scan Cancelled', description: 'The scan has been stopped.' })
      await fetchStatus()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setIsCancelling(false)
    }
  }

  // ── Filter vulnerabilities ────────────────────────────────────────────────

  const filteredVulns = (report?.vulnerabilities ?? []).filter(v => {
    const matchSeverity = severityFilter === 'all' || v.severity === severityFilter.toUpperCase()
    const matchSearch   = !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.file_path ?? '').toLowerCase().includes(search.toLowerCase())
    return matchSeverity && matchSearch
  })

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Shield className="h-12 w-12 text-indigo-500 animate-pulse" />
          <p className="text-zinc-600 dark:text-zinc-400">Loading scan...</p>
        </div>
      </div>
    )
  }

  if (!report || !report.status) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <XCircle className="h-12 w-12 text-red-400" />
        <p className="text-zinc-900 dark:text-white font-semibold">Scan not found or missing status data</p>
        <Button variant="outline" onClick={() => router.push('/scans')}>
          Back to Scans
        </Button>
      </div>
    )
  }

  // ── In Progress ───────────────────────────────────────────────────────────

  if (report.status !== 'completed' && report.status !== 'failed' && report.status !== 'cancelled') {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[#1f1f1f] rounded-2xl p-8 space-y-8">
          {/* Icon + Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <Shield className="h-8 w-8 text-indigo-400 animate-pulse" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
              {getStatusTitle(report.status)}
            </h1>
          </div>

          {/* Progress steps */}
          <ScanProgress
            status={report.status}
            progress={report.progress_percentage ?? 0}
            progressMessage={report.progress_message ?? undefined}
            queuePosition={report.queue_position}
          />

          {/* Cancel */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-500 dark:text-zinc-500 hover:text-zinc-300"
              onClick={() => router.push('/scans')}
            >
              ← Back to scans
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isCancelling}
              onClick={handleCancel}
              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Scan'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Failed ────────────────────────────────────────────────────────────────

  if (report.status === 'failed') {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-white dark:bg-[#111111] border border-red-500/20 rounded-2xl p-8 text-center space-y-4">
          <XCircle className="h-12 w-12 text-red-400 mx-auto" />
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Scan Failed</h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm">
            {report.error_message ?? 'An unexpected error occurred.'}
          </p>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-zinc-900 dark:text-white"
            onClick={() => router.push('/scans/new')}
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // ── Cancelled ─────────────────────────────────────────────────────────────

  if (report.status === 'cancelled') {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[#1f1f1f] rounded-2xl p-8 text-center space-y-4">
          <XCircle className="h-12 w-12 text-zinc-500 mx-auto" />
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Scan Cancelled</h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm">
            {report.progress_message ?? 'This scan was cancelled by the user.'}
          </p>
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => router.push('/scans')}
              className="border-zinc-200 dark:border-[#1f1f1f]"
            >
              Back to Scans
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-zinc-900 dark:text-white"
              onClick={() => router.push('/scans/new')}
            >
              Start New Scan
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Completed Report ──────────────────────────────────────────────────────

  // Map Supabase Vulnerability → VulnerabilityForPrompt for the modal
  const promptReport: ScanReportForPrompt = {
    scanId:      report.id,
    projectName: report.projects?.name ?? 'This Project',
    vulnerabilities: (report.vulnerabilities ?? []).map((v) => ({
      id:             v.id,
      type:           v.name,
      severity:       (v.severity ?? 'MEDIUM').toLowerCase(),
      filePath:       v.file_path        ?? '',
      lineNumber:     v.line_number      ?? 0,
      vulnerableCode: v.vulnerable_code  ?? '',
      fixedCode:      v.fixed_code       ?? '',
      explanation:    v.ai_explanation   ?? v.description ?? '',
      fixReasoning:   v.ai_fix_explanation ?? '',
      owaspId:        v.owasp_id         ?? undefined,
      language:       detectLanguage(v.file_path ?? ''),
    })),
  }

  const autoPushEnabled = report.auto_push_enabled ?? false
  const pushRepoUrl = report.push_repo_url ?? null

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {report.projects?.name ?? 'Security Report'}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">
            {new Date(report.created_at).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DownloadReportButton
            scanId={report.id}
            userPlan={userPlan}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="border-zinc-200 dark:border-[#1f1f1f] text-zinc-300 hover:bg-white/5 bg-transparent"
          >
            <Share2 className="h-4 w-4 mr-2" />
            {copied ? 'Copied!' : 'Share'}
          </Button>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-zinc-900 dark:text-white"
            onClick={() => router.push('/scans/new')}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Rescan
          </Button>
        </div>
      </div>

      {/* Score + Stats row */}
      <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[#1f1f1f] rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Score circle */}
          <SecurityScore
            score={report.security_score ?? 0}
            size="lg"
            showGrade
            showLabel
            animated
          />

          {/* Divider */}
          <div className="w-px h-32 bg-[#1f1f1f] hidden md:block" />

          {/* Severity grid */}
          <div className="grid grid-cols-2 gap-3 flex-1 w-full">
            {SEVERITY_CARDS.map(({ key, label, color, bg, icon: Icon }) => (
              <div key={key} className={`rounded-xl border p-4 ${bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className={`text-xs font-medium ${color}`}>{label}</span>
                </div>
                <p className={`text-2xl font-bold ${color}`}>
                  {(report[key as keyof ScanReport] as number | null) ?? 0}
                </p>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-32 bg-[#1f1f1f] hidden md:block" />

          {/* Scan metadata */}
          <div className="space-y-3 text-sm min-w-[140px]">
            <div>
              <p className="text-zinc-500 dark:text-zinc-500 text-xs">Files Scanned</p>
              <p className="text-zinc-900 dark:text-white font-semibold">{report.files_scanned ?? 0}</p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-500 text-xs">Lines Scanned</p>
              <p className="text-zinc-900 dark:text-white font-semibold">
                {(report.lines_scanned ?? 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 dark:text-zinc-500 text-xs">Total Issues</p>
              <p className="text-zinc-900 dark:text-white font-semibold">{report.total_vulnerabilities ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enterprise auto-push flow — shows above FixActionsCard */}
      <AutoPushFlow
        scanId={report.id}
        scanStatus={report.status}
        autoPushEnabled={autoPushEnabled}
        pushRepoUrl={pushRepoUrl}
        vulnerabilityIds={
          (report.vulnerabilities ?? [])
            .filter(v => !v.is_fixed && !v.is_false_positive)
            .map(v => v.id)
        }
        vulnerabilityCount={
          (report.vulnerabilities ?? [])
            .filter(v => !v.is_fixed && !v.is_false_positive)
            .length
        }
        userPlan={userPlan}
      />

      {/* Privacy: show expiry notice for scans older than 48h */}
      {report.status === 'completed' &&
        new Date(report.created_at).getTime() < Date.now() - 48 * 60 * 60 * 1000 && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
          <Shield className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <span>
            Source files auto-removed after 48h for your privacy. 
            Rescan to use Auto-Fix.
          </span>
        </div>
      )}
      {/* NEW: Fix Actions Card */}
      <FixActionsCard
        vulnerabilityCount={
          (report.vulnerabilities ?? [])
            .filter(v => !v.is_fixed && !v.is_false_positive)
            .length
        }
        userPlan={userPlan}
        onOpenPromptModal={() => setShowPromptModal(true)}
        autoFixButtonSlot={
          <AutoFixButton
            scanId={report.id}
            userPlan={userPlan}
            vulnerabilityIds={
              (report.vulnerabilities ?? [])
                .filter(v => !v.is_fixed && !v.is_false_positive)
                .map(v => v.id)
            }
            vulnerabilityCount={
              (report.vulnerabilities ?? [])
                .filter(v => !v.is_fixed && !v.is_false_positive)
                .length
            }
            onFixComplete={(job) => {
              setFixJob(job)
              setShowDiffViewer(true)
            }}
            onViewDiff={(job) => {
              setFixJob(job)
              setShowDiffViewer(true)
            }}
            onCreatePR={(job) => {
              setFixJob(job)
              setShowPRModal(true)
            }}
          />
        }
        fixJob={fixJob}
        onReset={handleResetFix}
      />

      {/* Vulnerability List */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Vulnerabilities
            <Badge className="ml-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-300 border-0">
              {filteredVulns.length}
            </Badge>
          </h2>

          {/* Filter + Search */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="h-4 w-4 text-zinc-500 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search vulnerabilities..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 bg-white dark:bg-[#111111] border-zinc-200 dark:border-[#1f1f1f] text-zinc-900 dark:text-white placeholder:text-zinc-600 text-sm w-48"
              />
            </div>

            {/* Severity tabs */}
            <Tabs value={severityFilter} onValueChange={setSeverityFilter}>
              <TabsList className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[#1f1f1f] h-9">
                {['all', 'critical', 'high', 'medium', 'low'].map(s => (
                  <TabsTrigger
                    key={s}
                    value={s}
                    className="capitalize text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-zinc-900 dark:text-white h-7"
                  >
                    {s}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Cards */}
        {filteredVulns.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-500">
            <Shield className="h-10 w-10 mx-auto mb-3 text-zinc-700" />
            <p>No vulnerabilities match your filter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVulns.map(v => (
              <VulnerabilityCard key={v.id} vulnerability={v} />
            ))}
          </div>
        )}
      </div>

      {/* Back link */}
      <div className="pb-8">
        <Link href="/scans" className="text-sm text-zinc-500 dark:text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Back to all scans
        </Link>
      </div>

      {/* AI Fix Prompt Modal */}
      <AiFixPromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        scanReport={promptReport}
      />
      {fixJob && (
        <DiffViewer
          isOpen={showDiffViewer}
          onClose={() => setShowDiffViewer(false)}
          fixJob={fixJob}
          scanId={report.id}
          userPlan={userPlan}
          repoUrl={report.projects?.repo_url ?? undefined}
        />
      )}

      {/* V2.2 — Standalone PR modal for Enterprise users */}
      {fixJob && userPlan === 'enterprise' && (
        <CreatePRModal
          isOpen={showPRModal}
          onClose={() => setShowPRModal(false)}
          scanId={report.id}
          fixJobId={fixJob.id}
          repoUrl={report.projects?.repo_url ?? undefined}
          filesCount={fixJob.fixed_count}
        />
      )}
    </div>
  )
}
