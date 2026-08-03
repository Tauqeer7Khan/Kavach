'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Shield, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[KAVACH Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 
                        rounded-full bg-red-500/10 border border-red-500/20 
                        mb-2">
          <Shield className="h-10 w-10 text-red-400" />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">
            Something went wrong
          </h1>
          <p className="text-zinc-400">
            An unexpected error occurred. Our team has been notified.
          </p>
        </div>

        {/* Error details in dev mode */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="bg-[#111111] border border-red-500/20 rounded-lg 
                          p-4 text-left">
            <p className="text-xs text-red-400 font-mono break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-zinc-500 font-mono mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            onClick={reset}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Link href="/dashboard">
            <Button
              variant="outline"
              className="border-[#1f1f1f] text-zinc-300 hover:bg-white/5 
                         bg-transparent w-full sm:w-auto"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
