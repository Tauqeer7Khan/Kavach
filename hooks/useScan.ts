'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase-client'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ScanStatus =
  | 'queued'
  | 'downloading'
  | 'scanning'
  | 'analyzing'
  | 'scoring'
  | 'completed'
  | 'failed'

export interface ScanState {
  id: string | null
  status: ScanStatus | null
  progress: number
  progressMessage: string
  queuePosition: number | null
  error: string | null
  securityScore: number | null
  grade: string | null
  totalVulnerabilities: number | null
  criticalCount: number | null
  highCount: number | null
  mediumCount: number | null
  lowCount: number | null
}

export interface CreateScanPayload {
  sourceType: 'upload' | 'github' | 'paste'
  projectName: string
  r2Key?: string        // for upload
  repoUrl?: string      // for github
  pastedCode?: string   // for paste
  language?: string     // for paste
}

interface UseScanReturn {
  scan: ScanState
  isCreating: boolean
  createScan: (payload: CreateScanPayload) => Promise<string | null>
  resetScan: () => void
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: ScanState = {
  id: null,
  status: null,
  progress: 0,
  progressMessage: '',
  queuePosition: null,
  error: null,
  securityScore: null,
  grade: null,
  totalVulnerabilities: null,
  criticalCount: null,
  highCount: null,
  mediumCount: null,
  lowCount: null,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useScan(): UseScanReturn {
  const [scan, setScan] = useState<ScanState>(initialState)
  const [isCreating, setIsCreating] = useState<boolean>(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = createClient()

  // Stop polling helper
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  // Poll scan status from API
  const pollStatus = useCallback(async (scanId: string): Promise<void> => {
    try {
      const res = await fetch(`/api/scan/${scanId}`)
      if (!res.ok) return

      const json = await res.json() as {
        success: boolean
        scan: {
          status: ScanStatus
          progress_percentage: number
          progress_message: string
          queue_position: number | null
          security_score: number | null
          grade: string | null
          total_vulnerabilities: number | null
          critical_count: number | null
          high_count: number | null
          medium_count: number | null
          low_count: number | null
          error_message: string | null
        }
      }

      if (!json.success || !json.scan) return
      const data = json.scan

      setScan(prev => ({
        ...prev,
        status: data.status,
        progress: data.progress_percentage ?? 0,
        progressMessage: data.progress_message ?? '',
        queuePosition: data.queue_position,
        error: data.error_message,
        securityScore: data.security_score,
        grade: data.grade,
        totalVulnerabilities: data.total_vulnerabilities,
        criticalCount: data.critical_count,
        highCount: data.high_count,
        mediumCount: data.medium_count,
        lowCount: data.low_count,
      }))

      // Stop polling when terminal state reached
      if (data.status === 'completed' || data.status === 'failed') {
        stopPolling()
      }
    } catch (err) {
      console.error('Poll error:', err)
    }
  }, [stopPolling])

  // Start polling + Supabase Realtime
  const startTracking = useCallback((scanId: string) => {
    // 1. Immediate first poll
    void pollStatus(scanId)

    // 2. Poll every 3 seconds as fallback
    pollingRef.current = setInterval(() => {
      void pollStatus(scanId)
    }, 3000)

    // 3. Supabase Realtime as primary (faster updates)
    const channel = supabase
      .channel(`scan-${scanId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scans',
          filter: `id=eq.${scanId}`,
        },
        (payload: any) => {
          const row = payload.new as Record<string, unknown>
          setScan(prev => ({
            ...prev,
            status: row.status as ScanStatus,
            progress: (row.progress_percentage as number) ?? 0,
            progressMessage: (row.progress_message as string) ?? '',
            queuePosition: row.queue_position as number | null,
            error: row.error_message as string | null,
            securityScore: row.security_score as number | null,
            grade: row.grade as string | null,
            totalVulnerabilities: row.total_vulnerabilities as number | null,
            criticalCount: row.critical_count as number | null,
            highCount: row.high_count as number | null,
            mediumCount: row.medium_count as number | null,
            lowCount: row.low_count as number | null,
          }))

          const status = row.status as ScanStatus
          if (status === 'completed' || status === 'failed') {
            stopPolling()
          }
        }
      )
      .subscribe()

    // Cleanup realtime on unmount
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [pollStatus, stopPolling, supabase])

  // Create a new scan
  const createScan = useCallback(async (
    payload: CreateScanPayload
  ): Promise<string | null> => {
    setIsCreating(true)
    setScan(initialState)

    try {
      const body: Record<string, unknown> = {
        sourceType: payload.sourceType,
        projectName: payload.projectName,
      }
      if (payload.r2Key) body.r2Key = payload.r2Key
      if (payload.repoUrl) body.repoUrl = payload.repoUrl
      if (payload.pastedCode) body.pastedCode = payload.pastedCode
      if (payload.language) body.language = payload.language

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json() as { error?: string }
        throw new Error(err.error ?? 'Failed to create scan')
      }

      const data = await res.json() as { scanId: string }
      const scanId = data.scanId

      setScan(prev => ({ ...prev, id: scanId, status: 'queued', progress: 0 }))
      startTracking(scanId)

      return scanId
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setScan(prev => ({ ...prev, error: message, status: 'failed' }))
      return null
    } finally {
      setIsCreating(false)
    }
  }, [startTracking])

  // Reset scan state
  const resetScan = useCallback((): void => {
    stopPolling()
    setScan(initialState)
  }, [stopPolling])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  return { scan, isCreating, createScan, resetScan }
}
