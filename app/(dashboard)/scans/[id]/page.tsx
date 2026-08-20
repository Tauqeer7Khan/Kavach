// app/(dashboard)/scans/[id]/page.tsx
// KAVACH — Scan Report Details Page (V2.3 with One-Click Ignore)

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield,
  RotateCcw,
  Share2,
  Check,
  Search,
  Filter,
  ShieldOff,
  AlertOctagon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import SecurityScore from '@/components/dashboard/SecurityScore'
import { detectLanguage } from '@/lib/prompt-generator'
import { VulnerabilityCard } from '@/components/dashboard/VulnerabilityCard'
import { AiFixPromptModal } from '@/components/scans/AiFixPromptModal'
import { AutoFixButton, type FixJob } from '@/components/scans/AutoFixButton'
import { AutoPushFlow } from '@/components/scans/AutoPushFlow'
import { FixActionsCard } from '@/components/scans/FixActionsCard'
import { DiffViewer } from '@/components/scans/DiffViewer'
import { DownloadReportButton } from '@/components/scans/DownloadReportButton'
import { CreatePRModal } from '@/components/scans/CreatePRModal'
import { useToast } from '@/hooks/use-toast'
import type { Scan, Vulnerability, UserPlan, VulnerabilitySeverity } from '@/types'

type FilterStatus = 'all' | 'active' | 'ignored'
type SeverityFilter = 'ALL' | VulnerabilitySeverity

interface ScanReport extends Scan {
  projects?: { name: string | null; repo_url: string | null } | null
}

export default function ScanReportPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [report, setReport] = React.useState<ScanReport | null>(null)
  const [vulnerabilities, setVulnerabilities] = React.useState<Vulnerability[]>([])
  const [userPlan, setUserPlan] = React.useState<UserPlan>('free')
  const [copiedLink, setCopiedLink] = React.useState(false)

  // V2.3 Filters
  const [statusFilter, setStatusFilter] = React.useState<FilterStatus>('all')
  const [severityFilter, setSeverityFilter] = React.useState<SeverityFilter>('ALL')
  const [searchQuery, setSearchQuery] = React.useState('')

  // Modals and Fix State
  const [showPromptModal, setShowPromptModal] = React.useState<boolean>(false)
  const [fixJob, setFixJob] = React.useState<FixJob | null>(null)
  const [showDiffViewer, setShowDiffViewer] = React.useState(false)
  const [showPRModal, setShowPRModal] = React.useState(false)

  const handleResetFix = () => {
    setFixJob(null)
    setShowDiffViewer(false)
    setShowPRModal(false)
  }

  // Fetch report data
  const fetchReport = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/scans/${params.id}`)
      if (!res.ok) {
        if (res.status === 404) router.push('/dashboard')
        return
      }
      const data = await res.json()
      setReport(data.scan)
      setVulnerabilities(data.vulnerabilities ?? [])
      setUserPlan(data.userPlan ?? 'free')
    } catch (err) {
      console.error('Failed to load report:', err)
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  React.useEffect(() => {
    fetchReport()
  }, [fetchReport])

  // Handle Share Report Link
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    toast({
      title: 'Link Copied',
      description: 'Report URL copied to clipboard.',
    })
    setTimeout(() => setCopiedLink(false), 2500)
  }

  // Handle One-Click Ignore Toggle Callback
  const handleIgnoreToggle = (
    vulnId: string,
    isIgnored: boolean,
    reason?: string,
    newScore?: number,
    newGrade?: string
  ) => {
    // 1. Update vulnerability in local state
    setVulnerabilities(prev =>
      prev.map(v =>
        v.id === vulnId
          ? { ...v, is_false_positive: isIgnored, false_positive_reason: reason ?? null }
          : v
      )
    )

    // 2. Update scan score & grade live in report state
    if (typeof newScore === 'number' && newGrade && report) {
      setReport(prev =>
        prev
          ? {
              ...prev,
              security_score: newScore,
              grade: newGrade as import('@/types').ScanGrade,
            }
          : prev
      )
    }

    toast({
      title: isIgnored ? 'Vulnerability Ignored' : 'Vulnerability Restored',
      description: isIgnored
        ? `Marked as ${reason || 'Accepted Risk'}. Security score recalculated.`
        : 'Restored to active findings. Security score recalculated.',
    })
  }

  if (loading || !report) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Shield className="h-10 w-10 text-purple-500 animate-pulse" />
        <p className="text-sm text-zinc-400">Loading security report...</p>
      </div>
    )
  }

  // Active vs Ignored Counts
  const activeVulns = vulnerabilities.filter(v => !v.is_false_positive)
  const ignoredVulns = vulnerabilities.filter(v => v.is_false_positive)

  // Filtered Vulnerabilities List
  const filteredVulnerabilities = vulnerabilities.filter(v => {
    // Status Filter
    if (statusFilter === 'active' && v.is_false_positive) return false
    if (statusFilter === 'ignored' && !v.is_false_positive) return false

    // Severity Filter
    if (severityFilter !== 'ALL' && v.severity !== severityFilter) return false

    // Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = v.name.toLowerCase().includes(q)
      const matchFile = v.file_path?.toLowerCase().includes(q) ?? false
      const matchDesc = v.description?.toLowerCase().includes(q) ?? false
      if (!matchName && !matchFile && !matchDesc) return false
    }

    return true
  })

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              {report.projects?.name ?? 'Scan Report'}
            </span>
            <span className="text-xs text-zinc-600">·</span>
            <span className="text-xs text-zinc-500 font-mono">{report.id.slice(0, 8)}</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mt-1">Security Scan Results</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Analyzed {report.files_scanned ?? 0} files ({(report.lines_scanned ?? 0).toLocaleString()} lines) using {report.analysis_engine ?? 'Semgrep + AI'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <DownloadReportButton scanId={report.id} userPlan={userPlan} />

          <Button
            size="sm"
            variant="outline"
            onClick={handleShare}
            className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-xs h-9"
          >
            {copiedLink ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5 mr-1.5" />}
            Share
          </Button>

          <Button
            size="sm"
            onClick={() => router.push('/scans/new')}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-9"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            New Scan
          </Button>
        </div>
      </div>

      {/* Top Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Security Score Widget */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Security Health Score
          </span>
          <SecurityScore
            score={report.security_score ?? 0}
            size="lg"
            showGrade
            showLabel
            animated
          />
        </div>

        {/* Severity Metrics Card */}
        <div className="md:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Vulnerability Breakdown
            </span>
            <span className="text-xs font-bold text-zinc-300">
              {activeVulns.length} Active {ignoredVulns.length > 0 && `· ${ignoredVulns.length} Ignored`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
              <span className="text-xs text-red-400 font-semibold block">Critical</span>
              <span className="text-2xl font-bold text-red-300 mt-1 block">
                {activeVulns.filter(v => v.severity === 'CRITICAL').length}
              </span>
            </div>

            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3 text-center">
              <span className="text-xs text-orange-400 font-semibold block">High</span>
              <span className="text-2xl font-bold text-orange-300 mt-1 block">
                {activeVulns.filter(v => v.severity === 'HIGH').length}
              </span>
            </div>

            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-center">
              <span className="text-xs text-yellow-400 font-semibold block">Medium</span>
              <span className="text-2xl font-bold text-yellow-300 mt-1 block">
                {activeVulns.filter(v => v.severity === 'MEDIUM').length}
              </span>
            </div>

            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-center">
              <span className="text-xs text-blue-400 font-semibold block">Low</span>
              <span className="text-2xl font-bold text-blue-300 mt-1 block">
                {activeVulns.filter(v => v.severity === 'LOW').length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Push Workflow Section */}
      {report.auto_push_enabled && report.push_repo_url && (
        <AutoPushFlow
          scanId={report.id}
          scanStatus={report.status}
          autoPushEnabled={report.auto_push_enabled}
          pushRepoUrl={report.push_repo_url}
          vulnerabilityIds={activeVulns.filter(v => !v.is_fixed).map(v => v.id)}
          vulnerabilityCount={activeVulns.filter(v => !v.is_fixed).length}
          userPlan={userPlan}
        />
      )}

      {/* Ready to Fix Section */}
      <FixActionsCard
        vulnerabilityCount={activeVulns.length}
        userPlan={userPlan}
        onOpenPromptModal={() => setShowPromptModal(true)}
        fixJob={fixJob}
        onReset={handleResetFix}
        autoFixButtonSlot={
          <AutoFixButton
            scanId={report.id}
            userPlan={userPlan}
            vulnerabilityIds={activeVulns.filter(v => !v.is_fixed).map(v => v.id)}
            vulnerabilityCount={activeVulns.filter(v => !v.is_fixed).length}
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
      />

      {/* Vulnerabilities Toolbar & Filters */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-zinc-100">Findings</h3>
            <span className="rounded-full bg-zinc-800 text-zinc-300 text-xs font-bold px-2 py-0.5">
              {filteredVulnerabilities.length}
            </span>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vulnerabilities..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-200 pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            />
          </div>
        </div>

        {/* Filter Bar (Active vs Ignored + Severity) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          {/* Status Filter (All / Active / Ignored) */}
          <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setStatusFilter('all')}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All ({vulnerabilities.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'active' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Active ({activeVulns.length})
            </button>
            <button
              onClick={() => setStatusFilter('ignored')}
              className={`text-xs px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                statusFilter === 'ignored' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ShieldOff className="h-3 w-3" />
              Ignored ({ignoredVulns.length})
            </button>
          </div>

          {/* Severity Filters */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <Filter className="h-3.5 w-3.5 text-zinc-500 mr-1" />
            {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                  severityFilter === sev
                    ? 'border-purple-500/50 bg-purple-500/15 text-purple-300'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Vulnerabilities Cards List */}
        {filteredVulnerabilities.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-12 text-center space-y-3">
            <AlertOctagon className="h-8 w-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-zinc-300">No vulnerabilities found</p>
            <p className="text-xs text-zinc-500">
              {statusFilter === 'ignored'
                ? 'No vulnerabilities have been ignored yet.'
                : 'No issues match your current filters or search query.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVulnerabilities.map(v => (
              <VulnerabilityCard
                key={v.id}
                vulnerability={v}
                scanId={report.id}
                userPlan={userPlan}
                onIgnoreToggle={handleIgnoreToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* AI Master Prompt Modal (Free Tier) */}
      <AiFixPromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        scanReport={{
          scanId: report.id,
          projectName: report.projects?.name ?? 'This Project',
          vulnerabilities: activeVulns.map((v) => ({
            id: v.id,
            type: v.name,
            severity: (v.severity ?? 'MEDIUM').toLowerCase(),
            filePath: v.file_path ?? '',
            lineNumber: v.line_number ?? 0,
            vulnerableCode: v.vulnerable_code ?? '',
            fixedCode: v.fixed_code ?? '',
            explanation: v.ai_explanation ?? v.description ?? '',
            fixReasoning: v.ai_fix_explanation ?? '',
            owaspId: v.owasp_id ?? undefined,
            language: detectLanguage(v.file_path ?? ''),
          })),
        }}
      />

      {/* Standalone Diff Viewer */}
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

      {/* Standalone PR Modal (Enterprise) */}
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
