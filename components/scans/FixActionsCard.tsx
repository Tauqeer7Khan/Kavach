'use client'

import * as React from 'react'
import { Bot, Zap, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FixActionsCardProps {
  vulnerabilityCount: number
  userPlan: 'free' | 'pro' | 'enterprise'
  onOpenPromptModal: () => void
  autoFixButtonSlot: React.ReactNode  // Pass the AutoFixButton here
}

export function FixActionsCard({
  vulnerabilityCount,
  userPlan,
  onOpenPromptModal,
  autoFixButtonSlot,
}: FixActionsCardProps) {
  // Don't show if no vulnerabilities
  if (vulnerabilityCount === 0) return null

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/40 to-zinc-950/40 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
          Ready to Fix These Issues?
        </h3>
      </div>
      <p className="text-xs text-zinc-400 mb-5">
        Choose how you want to fix the {vulnerabilityCount} vulnerabilities found in your code.
      </p>

      {/* Two action cards side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        
        {/* ── OPTION 1: AI Fix Prompt (FREE) ────────────── */}
        <div className="group relative flex flex-col rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 transition-all hover:border-indigo-500/40 hover:bg-indigo-500/10">
          <div className="flex-1 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 ring-1 ring-indigo-500/30">
              <Bot className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-zinc-100">
                  Get AI Fix Prompt
                </h4>
                <span className="rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5">
                  FREE
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Generates a detailed prompt with all vulnerabilities. Copy it and paste in Cursor, Copilot, Windsurf, ChatGPT, or Claude to fix everything in your IDE.
              </p>
            </div>
          </div>

          <Button
            onClick={onOpenPromptModal}
            className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-indigo-500/20 transition-all"
          >
            <Bot className="h-4 w-4" />
            Generate Fix Prompt
            <ArrowRight className="h-3.5 w-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>

        {/* ── OPTION 2: Auto-Fix All (PRO) ──────────────── */}
        <div className={`group relative flex flex-col rounded-xl border p-5 transition-all ${
          userPlan === 'free'
            ? 'border-zinc-700/40 bg-zinc-800/20'
            : 'border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-violet-500/5 hover:border-purple-500/40 hover:from-purple-500/10 hover:to-violet-500/10'
        }`}>
          <div className="flex-1 flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ${
              userPlan === 'free'
                ? 'bg-zinc-700/30 ring-zinc-600/30'
                : 'bg-purple-500/15 ring-purple-500/30'
            }`}>
              <Zap className={`h-5 w-5 ${
                userPlan === 'free' ? 'text-zinc-500' : 'text-purple-400'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={`text-sm font-semibold ${
                  userPlan === 'free' ? 'text-zinc-400' : 'text-zinc-100'
                }`}>
                  Auto-Fix All
                </h4>
                <span className={`rounded-full text-[10px] font-bold px-1.5 py-0.5 ${
                  userPlan === 'free'
                    ? 'bg-purple-500/15 text-purple-400'
                    : 'bg-purple-500/20 text-purple-300'
                }`}>
                  PRO
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${
                userPlan === 'free' ? 'text-zinc-500' : 'text-zinc-400'
              }`}>
                KAVACH&apos;s local AI fixes every vulnerability automatically. Review the diff, then download a ZIP of your patched files. No IDE needed.
              </p>
            </div>
          </div>

          {/* Slot for the actual AutoFixButton (with all its state logic) */}
          <div className="mt-4 [&>*]:w-full">
            {autoFixButtonSlot}
          </div>
        </div>
      </div>

      {/* Comparison hint */}
      {userPlan === 'free' && (
        <p className="text-[11px] text-zinc-500 text-center mt-4">
          💡 <strong className="text-zinc-400">Tip:</strong> Free users can copy a prompt and fix issues in their own IDE. Pro users get one-click auto-fix by KAVACH AI.
        </p>
      )}
    </div>
  )
}
