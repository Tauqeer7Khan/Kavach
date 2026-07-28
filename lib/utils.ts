import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { SupportedLanguage, ScanGrade, SecurityScoreConfig } from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  })
}

export function formatRelativeTime(date: string | Date): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const d = new Date(date)
  const diff = (d.getTime() - Date.now()) / 1000
  const absDiff = Math.abs(diff)

  if (absDiff < 60) return rtf.format(Math.round(diff), 'second')
  if (absDiff < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (absDiff < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (absDiff < 2592000) return rtf.format(Math.round(diff / 86400), 'day')
  if (absDiff < 31536000) return rtf.format(Math.round(diff / 2592000), 'month')
  return rtf.format(Math.round(diff / 31536000), 'year')
}

export function getSeverityColor(severity: string): string {
  switch (severity.toUpperCase()) {
    case 'CRITICAL': return 'text-red-500'
    case 'HIGH': return 'text-orange-500'
    case 'MEDIUM': return 'text-yellow-500'
    case 'LOW': return 'text-blue-500'
    case 'INFO': return 'text-gray-500'
    default: return 'text-gray-500'
  }
}

export function getScoreGrade(score: number): ScanGrade {
  if (score >= 90) return 'A+'
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

export function getScoreConfig(score: number): SecurityScoreConfig {
  const grade = getScoreGrade(score)
  
  if (score >= 90) {
    return { score, grade, label: 'Excellent', color: '#10B981', bgColor: '#D1FAE5', description: 'Highly secure.' }
  } else if (score >= 80) {
    return { score, grade, label: 'Good', color: '#34D399', bgColor: '#D1FAE5', description: 'Generally secure.' }
  } else if (score >= 70) {
    return { score, grade, label: 'Fair', color: '#FBBF24', bgColor: '#FEF3C7', description: 'Some issues.' }
  } else if (score >= 60) {
    return { score, grade, label: 'Poor', color: '#F87171', bgColor: '#FEE2E2', description: 'Many issues.' }
  } else {
    return { score, grade, label: 'Failing', color: '#EF4444', bgColor: '#FEE2E2', description: 'Critical issues.' }
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function truncateCode(code: string, maxLines: number): string {
  if (!code) return ''
  const lines = code.split('\n')
  if (lines.length <= maxLines) return code
  return lines.slice(0, maxLines).join('\n') + '\n... (truncated)'
}

export function detectLanguageFromExtension(filename: string): SupportedLanguage {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (!ext) return 'unknown'
  
  const map: Record<string, SupportedLanguage> = {
    'js': 'javascript', 'jsx': 'javascript', 'mjs': 'javascript', 'cjs': 'javascript',
    'ts': 'typescript', 'tsx': 'typescript',
    'py': 'python', 'pyw': 'python',
    'php': 'php', 'phtml': 'php', 'php5': 'php',
    'java': 'java',
    'go': 'go',
    'rb': 'ruby', 'erb': 'ruby',
    'rs': 'rust',
    'c': 'c', 'h': 'c',
    'cpp': 'cpp', 'cc': 'cpp', 'cxx': 'cpp', 'hpp': 'cpp', 'hh': 'cpp',
    'cs': 'csharp'
  }
  
  return map[ext] || 'unknown'
}

export function generateVulnCode(index: number): string {
  return `KAVACH-${String(index).padStart(3, '0')}`
}

export function estimateWaitTime(queuePosition: number): number {
  return Math.max(0, queuePosition) * 90
}
