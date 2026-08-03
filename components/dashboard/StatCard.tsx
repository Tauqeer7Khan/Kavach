'use client'

import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType | React.ReactNode
  color?: 'default' | 'red' | 'green' | 'yellow' | 'indigo'
  isLoading?: boolean
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = 'default',
  isLoading = false,
}: StatCardProps) {
  const iconColors: Record<string, string> = {
    default: 'text-zinc-400 bg-zinc-800',
    red: 'text-red-400 bg-red-500/10',
    green: 'text-green-400 bg-green-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    indigo: 'text-indigo-400 bg-indigo-500/10',
  }

  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      return icon;
    }
    const Icon = icon as React.ElementType;
    return <Icon className="h-5 w-5" />;
  }

  if (isLoading) {
    return (
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-24 bg-zinc-800" />
          <Skeleton className="h-10 w-10 rounded-lg bg-zinc-800" />
        </div>
        <Skeleton className="h-8 w-16 bg-zinc-800 mb-2" />
        <Skeleton className="h-3 w-32 bg-zinc-800" />
      </div>
    )
  }

  return (
    <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-6 hover:border-zinc-700 transition-colors group">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-zinc-400 font-medium">{title}</p>
        <div className={`p-2.5 rounded-lg ${iconColors[color]}`}>
          {renderIcon()}
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      {subtitle && (
        <p className="text-xs text-zinc-500">{subtitle}</p>
      )}
    </div>
  )
}
