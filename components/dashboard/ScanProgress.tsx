'use client'

import { Check, Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

type ScanStatus =
  | 'queued'
  | 'downloading'
  | 'scanning'
  | 'analyzing'
  | 'scoring'
  | 'completed'
  | 'failed'

interface ScanProgressProps {
  status: ScanStatus
  progress: number
  progressMessage?: string
  queuePosition?: number | null
}

const STEPS: { key: ScanStatus; label: string }[] = [
  { key: 'queued',      label: 'Queue'     },
  { key: 'downloading', label: 'Download'  },
  { key: 'scanning',    label: 'Scan'      },
  { key: 'analyzing',   label: 'AI Review' },
  { key: 'scoring',     label: 'Report'    },
]

const STATUS_ORDER: ScanStatus[] = [
  'queued', 'downloading', 'scanning', 'analyzing', 'scoring', 'completed',
]

function getStepState(
  stepKey: ScanStatus,
  currentStatus: ScanStatus
): 'done' | 'active' | 'pending' {
  const stepIdx    = STATUS_ORDER.indexOf(stepKey)
  const currentIdx = STATUS_ORDER.indexOf(currentStatus)
  if (currentIdx > stepIdx) return 'done'
  if (currentIdx === stepIdx) return 'active'
  return 'pending'
}

export default function ScanProgress({
  status,
  progress,
  progressMessage,
  queuePosition,
}: ScanProgressProps) {
  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center justify-between relative">
        {/* Connector line */}
        <div className="absolute top-5 left-0 right-0 h-px bg-[#1f1f1f] z-0" />

        {STEPS.map((step, idx) => {
          const state = getStepState(step.key, status)
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
              {/* Circle */}
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  border-2 transition-all duration-500
                  ${state === 'done'
                    ? 'bg-green-500 border-green-500'
                    : state === 'active'
                    ? 'bg-indigo-500/20 border-indigo-500 animate-pulse'
                    : 'bg-[#0a0a0a] border-[#1f1f1f]'
                  }
                `}
              >
                {state === 'done' ? (
                  <Check className="h-4 w-4 text-white" />
                ) : state === 'active' ? (
                  <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
                ) : (
                  <span className="text-xs text-zinc-600">{idx + 1}</span>
                )}
              </div>
              {/* Label */}
              <span
                className={`text-xs font-medium ${
                  state === 'done'
                    ? 'text-green-400'
                    : state === 'active'
                    ? 'text-indigo-400'
                    : 'text-zinc-600'
                }`}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <Progress value={progress} className="h-2 bg-[#1f1f1f]" />
        <div className="flex justify-between text-xs text-zinc-500">
          <span>{progressMessage || 'Processing...'}</span>
          <span>{progress}%</span>
        </div>
      </div>

      {/* Queue position */}
      {status === 'queued' && queuePosition && queuePosition > 0 && (
        <div className="text-center text-sm text-zinc-400">
          Position{' '}
          <span className="text-indigo-400 font-semibold">{queuePosition}</span>{' '}
          in queue · Estimated wait:{' '}
          <span className="text-zinc-300">{queuePosition * 2} min</span>
        </div>
      )}
    </div>
  )
}
