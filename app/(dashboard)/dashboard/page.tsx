import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ScanSearch, TrendingUp, AlertTriangle,
  AlertOctagon, Shield, PlusCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { Button } from '@/components/ui/button'
import StatCard from '@/components/dashboard/StatCard'
import ScanTable from '@/components/dashboard/ScanTable'
import { EmptyState } from '@/components/shared/EmptyState'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Scan {
  id: string
  project_id: string | null
  status: 'queued'|'downloading'|'scanning'|'analyzing'|'scoring'|'completed'|'failed'
  security_score: number | null
  grade: string | null
  total_vulnerabilities: number | null
  critical_count: number | null
  high_count: number | null
  created_at: string
  projects?: { name: string } | null
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function getDashboardData(userId: string) {
  const supabase = await createClient()

  const { data: scans } = await supabase
    .from('scans')
    .select('*, projects(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  const completedScans = (scans ?? []).filter(
    (s: Scan) => s.status === 'completed' && s.security_score !== null
  )

  const stats = {
    totalScans: scans?.length ?? 0,
    avgScore: completedScans.length > 0
      ? Math.round(
          completedScans.reduce((sum: number, s: Scan) => sum + (s.security_score ?? 0), 0) /
          completedScans.length
        )
      : null,
    totalVulns: (scans ?? []).reduce(
      (sum: number, s: Scan) => sum + (s.total_vulnerabilities ?? 0), 0
    ),
    totalCritical: (scans ?? []).reduce(
      (sum: number, s: Scan) => sum + (s.critical_count ?? 0), 0
    ),
  }

  return { scans: (scans ?? []) as Scan[], stats }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name, scans_used_this_month, scans_limit')
    .eq('id', user.id)
    .single()

  const { scans, stats } = await getDashboardData(user.id)
  const displayName = profile?.name ?? user.email?.split('@')[0] ?? 'there'
  const scansRemaining = (profile?.scans_limit ?? 5) - (profile?.scans_used_this_month ?? 0)

  return (
    <div className="space-y-8">

      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {displayName}! 👋
          </h1>
          <p className="text-zinc-400 mt-1">
            {stats.totalScans === 0
              ? 'Start your first security scan to protect your code'
              : "Here's your security overview"
            }
          </p>
        </div>
        <Link href="/scans/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <PlusCircle className="h-4 w-4 mr-2" />
            New Scan
          </Button>
        </Link>
      </div>

      {/* Scans remaining alert */}
      {scansRemaining <= 2 && scansRemaining > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          You have <strong>{scansRemaining}</strong> of{' '}
          <strong>{profile?.scans_limit ?? 5}</strong> free scans remaining this month.
        </div>
      )}

      {/* Stat Cards */}
      {stats.totalScans > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Scans"
            value={stats.totalScans}
            subtitle="All time"
            icon={<ScanSearch className="h-5 w-5" />}
            color="indigo"
          />
          <StatCard
            title="Average Score"
            value={stats.avgScore !== null ? `${stats.avgScore}/100` : 'N/A'}
            subtitle="Completed scans"
            icon={<TrendingUp className="h-5 w-5" />}
            color={
              stats.avgScore === null ? 'default'
              : stats.avgScore >= 80 ? 'green'
              : stats.avgScore >= 60 ? 'yellow'
              : 'red'
            }
          />
          <StatCard
            title="Vulnerabilities Found"
            value={stats.totalVulns}
            subtitle="Across all scans"
            icon={<AlertTriangle className="h-5 w-5" />}
            color="yellow"
          />
          <StatCard
            title="Critical Issues"
            value={stats.totalCritical}
            subtitle={stats.totalCritical > 0 ? 'Needs attention!' : 'All clear'}
            icon={<AlertOctagon className="h-5 w-5" />}
            color={stats.totalCritical > 0 ? 'red' : 'green'}
          />
        </div>
      )}

      {/* New Scan CTA Card */}
      <div className="bg-[#111111] border border-[#1f1f1f] border-l-4 border-l-indigo-500 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-white font-semibold">Scan your AI-generated code</h3>
            <p className="text-sm text-zinc-400 max-w-md">
              Upload files or paste a GitHub URL to find vulnerabilities in under 2 minutes.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-zinc-500 pt-1">
              {['✓ SQL Injection', '✓ Secret Scanning', '✓ XSS Detection', '✓ AI Review'].map(item => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
          <Link href="/scans/new" className="flex-shrink-0">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap">
              Start New Scan →
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Scans</h2>
          {scans.length > 0 && (
            <Link href="/scans" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              View all →
            </Link>
          )}
        </div>

        {scans.length === 0 ? (
          <EmptyState
            icon={<Shield className="h-8 w-8 text-zinc-600" />}
            title="No scans yet"
            description="Scan your first project to see security results here"
            actionLabel="Start Your First Scan"
            actionHref="/scans/new"
          />
        ) : (
          <ScanTable scans={scans.slice(0, 5)} />
        )}
      </div>
    </div>
  )
}
