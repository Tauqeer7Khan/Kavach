'use client'

import { useUser } from '@/hooks/useUser'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Shield } from 'lucide-react'

export default function DashboardPage() {
  const { user, loading } = useUser()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading your dashboard..." />
      </div>
    )
  }

  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="font-heading font-bold text-3xl md:text-4xl text-white tracking-tight">
          Welcome back, <span className="font-accent italic text-[#7C3AED] font-normal">{firstName}</span>
        </h1>
        <p className="font-body text-zinc-400 text-base mt-2">
          Here is your security overview
        </p>
      </div>

      {/* Empty State Card */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-12 unique-card">
        <EmptyState
          icon={Shield}
          title="No scans yet"
          description="Start your first security scan to protect your AI-generated code from vulnerabilities. Upload files, connect GitHub, or paste code directly."
          actionLabel="Start Your First Scan"
          actionHref="/scans/new"
        />
      </div>
    </div>
  )
}
