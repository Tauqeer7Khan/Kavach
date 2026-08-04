'use client'

import { useEffect, useState } from 'react'

interface SecurityScoreProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showGrade?: boolean
  showLabel?: boolean
  animated?: boolean
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'   // green
  if (score >= 70) return '#f59e0b'   // amber
  if (score >= 50) return '#f97316'   // orange
  return '#ef4444'                     // red
}

function getGrade(score: number): string {
  if (score >= 95) return 'A+'
  if (score >= 85) return 'A'
  if (score >= 75) return 'B'
  if (score >= 65) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

function getLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Good'
  if (score >= 70) return 'Fair'
  if (score >= 50) return 'Poor'
  if (score >= 30) return 'Critical'
  return 'Dangerous'
}

const sizes = {
  sm: { svg: 80,  stroke: 6,  fontSize: 'text-xl',  gradeSize: 'text-xs' },
  md: { svg: 120, stroke: 8,  fontSize: 'text-3xl', gradeSize: 'text-sm' },
  lg: { svg: 160, stroke: 10, fontSize: 'text-5xl', gradeSize: 'text-lg' },
}

export default function SecurityScore({
  score,
  size = 'md',
  showGrade = true,
  showLabel = false,
  animated = true,
}: SecurityScoreProps) {
  const [displayScore, setDisplayScore] = useState<number>(animated ? 0 : score)
  const cfg = sizes[size]
  const color = getScoreColor(score)
  const grade = getGrade(score)
  const label = getLabel(score)

  // Animate score counting up
  useEffect(() => {
    if (!animated) { setDisplayScore(score); return }
    let current = 0
    const step = Math.ceil(score / 40)
    const timer = setInterval(() => {
      current = Math.min(current + step, score)
      setDisplayScore(current)
      if (current >= score) clearInterval(timer)
    }, 30)
    return () => clearInterval(timer)
  }, [score, animated])

  // SVG circle math
  const radius = (cfg.svg - cfg.stroke * 2) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (displayScore / 100) * circumference
  const center = cfg.svg / 2

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: cfg.svg, height: cfg.svg }}>
        <svg width={cfg.svg} height={cfg.svg} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#1f1f1f"
            strokeWidth={cfg.stroke}
          />
          {/* Score arc */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={cfg.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.05s ease-out' }}
          />
        </svg>

        {/* Score number in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold text-zinc-900 dark:text-white ${cfg.fontSize}`}>
            {displayScore}
          </span>
        </div>
      </div>

      {showGrade && (
        <span
          className={`font-bold ${cfg.gradeSize}`}
          style={{ color }}
        >
          Grade {grade}
        </span>
      )}
      {showLabel && (
        <span className="text-xs text-zinc-600 dark:text-zinc-400">{label}</span>
      )}
    </div>
  )
}
