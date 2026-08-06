// components/scans/AiFixPromptModal.tsx
// KAVACH V2 — AI Fix Prompt Modal (Phase 1, Free Tier)

'use client'

import * as React from 'react'
import { Bot, CheckCheck, Copy, ExternalLink, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  generateMasterPrompt,
  IDE_INSTRUCTIONS,
  type IdeType,
  type ScanReportForPrompt,
} from '@/lib/prompt-generator'

// ─────────────────────────────────────────────────────────────────────────────
// IDE tab definitions
// ─────────────────────────────────────────────────────────────────────────────

interface IdeMeta {
  id: IdeType
  label: string
  emoji: string
}

const IDE_TABS: IdeMeta[] = [
  { id: 'cursor',   label: 'Cursor',          emoji: '⚡' },
  { id: 'copilot',  label: 'Copilot',         emoji: '🐙' },
  { id: 'windsurf', label: 'Windsurf',        emoji: '🏄' },
  { id: 'chatgpt',  label: 'ChatGPT/Claude',  emoji: '🤖' },
  { id: 'other',    label: 'Other',            emoji: '✨' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface AiFixPromptModalProps {
  isOpen: boolean
  onClose: () => void
  scanReport: ScanReportForPrompt
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AiFixPromptModal({
  isOpen,
  onClose,
  scanReport,
}: AiFixPromptModalProps) {
  const { toast }                     = useToast()
  const [selectedIde, setSelectedIde] = React.useState<IdeType>('cursor')
  const [copied, setCopied]           = React.useState(false)

  const vulnCount = scanReport.vulnerabilities.length
  const hasVulns  = vulnCount > 0
  const isLarge   = vulnCount > 40

  // Re-generate prompt when IDE or report changes
  const prompt = React.useMemo(
    () => generateMasterPrompt(scanReport, selectedIde),
    [scanReport, selectedIde],
  )

  // ── Copy handler ────────────────────────────────────────────────────────────
  const handleCopy = React.useCallback(async () => {
    // Fallback: manually select the textarea if clipboard API is unavailable
    if (!navigator?.clipboard?.writeText) {
      const el = document.getElementById('kavach-prompt-preview') as HTMLTextAreaElement | null
      if (el) {
        el.select()
        // execCommand is deprecated but works as a last resort
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        document.execCommand('copy')
        setCopied(true)
        toast({ title: 'Prompt copied!', description: 'Paste it into your AI IDE to start fixing.' })
        setTimeout(() => setCopied(false), 3000)
      }
      return
    }

    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      toast({ title: 'Prompt copied!', description: 'Paste it into your AI IDE to start fixing.' })
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Click inside the preview box, press Ctrl+A then Ctrl+C.',
        variant: 'destructive',
      })
    }
  }, [prompt, toast])

  const instructions = IDE_INSTRUCTIONS[selectedIde]

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => { if (!open) onClose() }}>
      <DialogContent
        showCloseButton
        className="sm:max-w-2xl w-full bg-zinc-900 border border-zinc-700/60 text-zinc-100 shadow-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden"
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-zinc-700/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/20 ring-1 ring-indigo-500/30">
              <Bot className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-zinc-100 leading-none">
                AI Fix Prompt Generator
              </DialogTitle>
              <p className="text-xs text-zinc-400 mt-1">
                {hasVulns
                  ? `${vulnCount} ${vulnCount === 1 ? 'vulnerability' : 'vulnerabilities'} ready to fix`
                  : 'No vulnerabilities found'}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Zero-vulnerability state */}
          {!hasVulns && (
            <div className="px-6 py-16 text-center space-y-3">
              <div className="text-5xl">🎉</div>
              <p className="text-base font-semibold text-zinc-200">Your code looks clean!</p>
              <p className="text-sm text-zinc-400">
                This scan found zero vulnerabilities. Nothing to fix.
              </p>
            </div>
          )}

          {/* Main content */}
          {hasVulns && (
            <div className="px-6 py-5 space-y-5">

              {/* Large-prompt warning */}
              {isLarge && (
                <div className="flex gap-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 px-4 py-3 text-sm text-amber-300">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span>
                    This prompt covers <strong>{vulnCount} vulnerabilities</strong> and may
                    exceed context limits in some AI IDEs. If the AI stops mid-way, split the
                    prompt by file.
                  </span>
                </div>
              )}

              {/* ── IDE selector tabs ────────────────────────────────────── */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Select your AI IDE
                </p>

                {/* Tab bar — Tabs used only for selection logic */}
                <Tabs
                  value={selectedIde}
                  onValueChange={(v: string) => setSelectedIde(v as IdeType)}
                  className="w-full"
                >
                  <TabsList className="w-full grid grid-cols-5 gap-1 bg-zinc-800/70 p-1 rounded-xl h-auto border border-zinc-700/40">
                    {IDE_TABS.map((ide) => (
                      <TabsTrigger
                        key={ide.id}
                        value={ide.id}
                        className="flex flex-col items-center gap-1 px-1 py-2.5 rounded-lg text-xs font-medium text-zinc-500 transition-all duration-200 data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-active:bg-indigo-600 data-active:text-white hover:text-zinc-200 hover:bg-zinc-700/50 cursor-pointer"
                      >
                        <span className="text-lg leading-none">{ide.emoji}</span>
                        <span className="truncate w-full text-center leading-tight text-[10px]">
                          {ide.label}
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>

                {/* Instructions panel — always full-width below the tab bar */}
                <div className="rounded-xl bg-zinc-800/40 border border-zinc-700/50 overflow-hidden">
                  {/* Panel header */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-700/40 bg-zinc-800/60">
                    <span className="text-base leading-none">
                      {IDE_TABS.find((t) => t.id === selectedIde)?.emoji}
                    </span>
                    <p className="text-xs font-semibold text-zinc-200">
                      How to use with{' '}
                      <span className="text-indigo-400">
                        {IDE_TABS.find((t) => t.id === selectedIde)?.label}
                      </span>
                    </p>
                  </div>

                  {/* Steps */}
                  <ol className="px-4 py-3 space-y-2">
                    {instructions.map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-indigo-600/25 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold">
                          {i + 1}
                        </span>
                        <span className="text-xs text-zinc-300 leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* ── Prompt preview ───────────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Prompt Preview
                  </p>
                  <span className="text-[10px] text-zinc-600 font-mono">
                    {prompt.length.toLocaleString()} chars · {vulnCount} vulns
                  </span>
                </div>
                <textarea
                  id="kavach-prompt-preview"
                  readOnly
                  value={prompt}
                  aria-label="Generated AI fix prompt"
                  className="w-full h-56 resize-none rounded-lg border border-zinc-700/60 bg-zinc-950 text-zinc-300 font-mono text-[11px] leading-relaxed px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                />
              </div>

            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-zinc-700/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-shrink-0 bg-zinc-900">
          {/* Copy button */}
          {hasVulns && (
            <Button
              onClick={handleCopy}
              className="sm:min-w-[150px] bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center justify-center gap-2 transition-colors duration-150"
            >
              {copied ? (
                <>
                  <CheckCheck className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Prompt
                </>
              )}
            </Button>
          )}

          {/* Upgrade hint */}
          <Button
            variant="outline"
            className="border-indigo-500/40 text-indigo-400 hover:bg-indigo-600/10 hover:text-indigo-300 flex items-center justify-center gap-2 font-medium transition-colors duration-150 dark:border-indigo-500/40 dark:bg-transparent"
            onClick={() => window.open('/pricing', '_blank', 'noopener,noreferrer')}
          >
            <Sparkles className="h-4 w-4" />
            Upgrade for Auto-Fix
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Button>

          {/* Close */}
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-sm ml-auto"
          >
            Close
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}
