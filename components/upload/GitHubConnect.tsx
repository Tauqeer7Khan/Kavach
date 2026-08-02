'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { GithubIcon } from '@/components/shared/GithubIcon'

interface GitHubConnectProps {
  onRepoValidated: (url: string, name: string) => void
}

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid'

export function GitHubConnect({ onRepoValidated }: GitHubConnectProps) {
  const [repoUrl, setRepoUrl] = useState('')
  const [state, setState] = useState<ValidationState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [repoMetadata, setRepoMetadata] = useState<{ name: string; owner: string } | null>(null)

  const validateRepo = async () => {
    setErrorMessage('')
    
    const githubPattern = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/
    const match = repoUrl.match(githubPattern)
    
    if (!match) {
      setState('invalid')
      setErrorMessage('Please enter a valid GitHub repository URL')
      return
    }

    const [, owner, name] = match
    
    setState('validating')
    
    // Placeholder — real API call comes in Part 2
    await new Promise(resolve => setTimeout(resolve, 800))
    
    setRepoMetadata({ name, owner })
    setState('valid')
    onRepoValidated(repoUrl, `${owner}/${name}`)
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="repo-url" className="font-body font-medium text-sm text-white block mb-2">
          GitHub Repository URL
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <GithubIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" size={16} />
            <Input
              id="repo-url"
              value={repoUrl}
              onChange={(e) => { setRepoUrl(e.target.value); setState('idle'); }}
              placeholder="https://github.com/username/repository"
              className="pl-10 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 font-mono text-sm focus-visible:ring-[#7C3AED] focus-visible:ring-offset-0"
            />
          </div>
          <button
            onClick={validateRepo}
            disabled={state === 'validating' || repoUrl.length === 0}
            className="px-5 py-2 rounded-lg bg-gradient-to-b from-[#8B5CF6] to-[#7C3AED] text-white font-heading font-semibold text-sm shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 whitespace-nowrap flex items-center gap-2"
          >
            {state === 'validating' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Validating...
              </>
            ) : (
              'Validate Repo'
            )}
          </button>
        </div>
        <p className="font-mono text-xs text-zinc-500 mt-2">
          Only public repositories supported
        </p>
      </div>

      {state === 'valid' && repoMetadata && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-[#34D399] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-heading font-semibold text-emerald-300 text-sm">
                Repository validated
              </p>
              <p className="font-mono text-xs text-emerald-400/80 mt-1">
                {repoMetadata.owner} / {repoMetadata.name}
              </p>
            </div>
          </div>
        </div>
      )}

      {state === 'invalid' && errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-[#F87171] flex-shrink-0 mt-0.5" />
            <p className="font-body text-sm text-red-400">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  )
}
