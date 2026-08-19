// components/scans/CreatePRModal.tsx
'use client'

import * as React from 'react'
import {
  GitPullRequest,
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  GitBranch,
  ChevronDown,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface CreatePRModalProps {
  isOpen:      boolean
  onClose:     () => void
  scanId:      string
  fixJobId:    string
  repoUrl?:    string
  filesCount:  number
}

type Phase = 'config' | 'creating' | 'success' | 'error'

export function CreatePRModal({
  isOpen,
  onClose,
  scanId,
  fixJobId,
  repoUrl: initialRepoUrl,
  filesCount,
}: CreatePRModalProps) {
  const { toast } = useToast()

  const [phase, setPhase]           = React.useState<Phase>('config')
  const [repoUrl, setRepoUrl]       = React.useState(initialRepoUrl ?? '')
  const [baseBranch, setBaseBranch] = React.useState('main')
  const [prUrl, setPrUrl]           = React.useState('')
  const [prNumber, setPrNumber]     = React.useState<number | null>(null)
  const [error, setError]           = React.useState('')

  // V2.2 — Branch dropdown state
  const [branches, setBranches]           = React.useState<string[]>([])
  const [loadingBranches, setLoading]     = React.useState(false)
  const [branchError, setBranchError]     = React.useState('')
  const [dropdownOpen, setDropdownOpen]   = React.useState(false)

  // V2.2 — Auto-fetch branches when modal opens (and we have a repo URL)
  React.useEffect(() => {
    if (!isOpen || !repoUrl.trim()) return

    let cancelled = false
    const fetchBranches = async () => {
      setLoading(true)
      setBranchError('')
      try {
        const res = await fetch(
          `/api/github/branches?repoUrl=${encodeURIComponent(repoUrl.trim())}`
        )
        const data = await res.json()

        if (cancelled) return

        if (!res.ok) {
          setBranchError(data.message ?? data.error ?? 'Failed to load branches')
          setBranches([])
          return
        }

        setBranches(data.branches ?? [])
        // Auto-select the default branch if available
        if (data.defaultBranch) {
          setBaseBranch(data.defaultBranch)
        }
      } catch {
        if (!cancelled) {
          setBranchError('Network error — could not load branches')
          setBranches([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchBranches()
    return () => { cancelled = true }
  }, [isOpen, repoUrl])

  const handleCreate = async () => {
    if (!repoUrl.trim()) {
      toast({
        title:       'Repository URL required',
        description: 'Enter the GitHub repository URL to continue.',
        variant:     'destructive',
      })
      return
    }

    setPhase('creating')
    setError('')

    try {
      // V2.2 — No more prTitle in body; backend auto-generates it
      const res = await fetch(`/api/scans/${scanId}/auto-fix/create-pr`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          fixJobId,
          repoUrl:    repoUrl.trim(),
          baseBranch: baseBranch.trim() || 'main',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setPhase('error')
        setError(data.message ?? data.error ?? 'Failed to create PR')
        return
      }

      setPrUrl(data.prUrl)
      setPrNumber(data.prNumber)
      setPhase('success')

      toast({
        title:       '✅ PR Created!',
        description: `Pull request #${data.prNumber} opened.`,
      })
    } catch (err) {
      setPhase('error')
      const errorMessage = err instanceof Error ? err.message : 'Network error'
      setError(errorMessage)
    }
  }

  const handleReset = () => {
    setPhase('config')
    setError('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        className="sm:max-w-lg w-full bg-zinc-900 border border-zinc-700/60 text-zinc-100 p-0 gap-0 overflow-hidden"
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-700/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600/20 ring-1 ring-purple-500/30">
              <GitPullRequest className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Create Pull Request
              </DialogTitle>
              <p className="text-xs text-zinc-400 mt-0.5">
                Push {filesCount} fixed {filesCount === 1 ? 'file' : 'files'} as a GitHub PR
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 min-h-[280px]">

          {phase === 'config' && (
            <>
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Repository URL
                </label>
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                />
              </div>

              {/* V2.2 — Base Branch DROPDOWN (replaces text input) */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Base branch
                </label>
                <div className="mt-1.5 relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    disabled={loadingBranches || branches.length === 0}
                    className="w-full flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-100 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-zinc-900 transition-colors"
                  >
                    <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <span className="text-left flex-1 truncate">
                      {loadingBranches ? (
                        <span className="flex items-center gap-2 text-zinc-500">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading branches...
                        </span>
                      ) : branches.length === 0 && branchError ? (
                        <span className="text-red-400 text-xs">{branchError}</span>
                      ) : (
                        baseBranch
                      )}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown menu */}
                  {dropdownOpen && branches.length > 0 && (
                    <>
                      {/* Backdrop to close on outside click */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setDropdownOpen(false)}
                      />
                      <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 shadow-xl">
                        {branches.map((branch) => (
                          <button
                            key={branch}
                            type="button"
                            onClick={() => {
                              setBaseBranch(branch)
                              setDropdownOpen(false)
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-zinc-800 transition-colors ${
                              branch === baseBranch
                                ? 'bg-purple-500/10 text-purple-300'
                                : 'text-zinc-300'
                            }`}
                          >
                            <GitBranch className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            <span className="truncate">{branch}</span>
                            {branch === baseBranch && (
                              <CheckCircle2 className="h-3.5 w-3.5 ml-auto text-purple-400 shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {branchError && !loadingBranches && (
                  <p className="mt-1 text-[11px] text-red-400/80">{branchError}</p>
                )}
              </div>

              {/* V2.2 — PR TITLE FIELD REMOVED (backend auto-generates it) */}

              <div className="rounded-lg bg-purple-500/5 border border-purple-500/20 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-zinc-300 space-y-1">
                    <p>KAVACH will:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-zinc-400 pl-1">
                      <li>Create a new branch from <code className="text-purple-300">{baseBranch || 'main'}</code></li>
                      <li>Commit {filesCount} fixed {filesCount === 1 ? 'file' : 'files'}</li>
                      <li>Open a PR with detailed severity breakdown</li>
                      <li>Add labels: security, kavach, automated</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {phase === 'creating' && (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="h-10 w-10 text-purple-400 animate-spin mx-auto" />
              <p className="text-sm font-medium text-zinc-200">
                Creating your pull request...
              </p>
              <p className="text-xs text-zinc-500">
                Creating branch → committing files → opening PR
              </p>
            </div>
          )}

          {phase === 'success' && (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
              <div>
                <p className="text-base font-semibold text-zinc-100">
                  Pull Request Created!
                </p>
                <p className="text-sm text-zinc-400 mt-1">
                  PR #{prNumber} opened successfully
                </p>
              </div>
              <a
                href={prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 text-sm font-medium transition-colors"
              >
                <GitPullRequest className="h-4 w-4" />
                View on GitHub
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            </div>
          )}

          {phase === 'error' && (
            <div className="py-4 space-y-3">
              <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/25 p-3">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div className="text-sm text-red-300 flex-1">
                  <p className="font-medium mb-1">Failed to create PR</p>
                  <p className="text-xs text-red-400/80">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-700/60 flex items-center justify-end gap-2 bg-zinc-900">
          {phase === 'config' && (
            <>
              <Button variant="ghost" onClick={onClose}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
                Cancel
              </Button>
              <Button onClick={handleCreate}
                className="bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2">
                <GitPullRequest className="h-4 w-4" />
                Create Pull Request
              </Button>
            </>
          )}

          {phase === 'creating' && (
            <Button disabled variant="ghost" className="text-zinc-500">
              Creating...
            </Button>
          )}

          {phase === 'success' && (
            <Button onClick={onClose}
              className="bg-emerald-600 hover:bg-emerald-500 text-white">
              Done
            </Button>
          )}

          {phase === 'error' && (
            <>
              <Button variant="ghost" onClick={onClose}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
                Close
              </Button>
              <Button onClick={handleReset}
                className="bg-purple-600 hover:bg-purple-500 text-white">
                Try Again
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
