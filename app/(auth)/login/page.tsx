'use client'

import { useState, Suspense } from 'react'
import { signInWithGitHub } from '@/lib/auth'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

function LoginContent() {
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const handleLogin = async () => {
    try {
      setIsAuthenticating(true)
      await signInWithGitHub()
    } catch (err) {
      console.error(err)
      setIsAuthenticating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="z-10 w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 backdrop-blur-sm mr-4">
             <span className="text-2xl font-bold text-white">🛡️</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">KAVACH</h1>
        </div>

        <div className="w-full bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-md shadow-2xl flex flex-col items-center text-center">
          <h2 className="text-2xl font-semibold text-white mb-2">Secure your AI-generated code</h2>
          <p className="text-gray-400 mb-8 max-w-sm">
            Sign in to start scanning your code for security vulnerabilities.
          </p>

          {error && (
            <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm">
              {error === 'auth_failed' ? 'Authentication failed. Please try again.' : 
               error === 'user_creation_failed' ? 'Failed to setup account. Please try again.' : 
               'An error occurred during sign in.'}
            </div>
          )}

          <button 
            onClick={handleLogin}
            disabled={isAuthenticating}
            className="w-full flex items-center justify-center space-x-2 bg-white text-black hover:bg-gray-100 transition-all px-4 py-3 rounded-lg font-medium text-lg disabled:opacity-70 disabled:cursor-not-allowed group"
          >
            {isAuthenticating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 group-hover:scale-110 transition-transform"
              >
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
            )}
            <span>{isAuthenticating ? 'Connecting...' : 'Continue with GitHub'}</span>
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500 max-w-sm">
          By continuing, you agree to KAVACH&apos;s{' '}
          <Link href="/terms" className="text-gray-400 hover:text-white underline underline-offset-4">Terms of Service</Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-gray-400 hover:text-white underline underline-offset-4">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
