'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Zap,
  Crown,
  Check,
  Loader2,
  ExternalLink,
  Sparkles,
  Shield,
  Calendar,
} from 'lucide-react'

interface UpgradeCardProps {
  currentPlan: string
  subscriptionStatus?: string | null
  subscriptionPeriodEnd?: string | null
}

export function UpgradeCard({
  currentPlan,
  subscriptionStatus,
  subscriptionPeriodEnd,
}: UpgradeCardProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const paymentStatus = searchParams.get('payment')

  async function handleCheckout(priceId: string, planName: string) {
    setLoading(planName)
    setError(null)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch {
      setError('Failed to start checkout. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  async function handlePortal() {
    setLoading('portal')
    setError(null)

    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      window.location.href = data.url
    } catch {
      setError('Failed to open billing portal.')
    } finally {
      setLoading(null)
    }
  }

  const isPro = currentPlan === 'pro'
  const isEnterprise = currentPlan === 'enterprise'
  const isPaid = isPro || isEnterprise

  return (
    <div className="space-y-4">
      {/* Success / Cancel banners */}
      {paymentStatus === 'success' && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-emerald-300 font-medium text-sm">
              Payment successful! 🎉
            </p>
            <p className="text-emerald-400/70 text-xs mt-0.5">
              Your plan has been upgraded. Enjoy your new features!
            </p>
          </div>
        </div>
      )}

      {paymentStatus === 'canceled' && (
        <div className="bg-zinc-500/10 border border-zinc-500/30 rounded-xl p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-zinc-400 shrink-0" />
          <p className="text-zinc-400 text-sm">
            Checkout was canceled. You can upgrade anytime.
          </p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Subscription Status Overview (for paid users) */}
      {isPaid && (
        <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[#1f1f1f] rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                  Subscription Overview
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    subscriptionStatus === 'active' || !subscriptionStatus
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {subscriptionStatus
                    ? subscriptionStatus.replace('_', ' ').toUpperCase()
                    : 'ACTIVE'}
                </span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">
                You are currently on the{' '}
                <span className="text-indigo-500 dark:text-indigo-400 font-semibold capitalize">
                  {currentPlan}
                </span>{' '}
                plan.
              </p>
              {subscriptionPeriodEnd && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  <span>
                    Billing cycle ends:{' '}
                    <strong className="text-zinc-800 dark:text-zinc-200 font-mono">
                      {new Date(subscriptionPeriodEnd).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handlePortal}
              disabled={loading === 'portal'}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium
                         bg-indigo-600 hover:bg-indigo-500 text-white
                         rounded-lg shadow-sm transition-all disabled:opacity-50 shrink-0"
            >
              {loading === 'portal' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Manage Subscription
            </button>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[#1f1f1f] rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
            {isPaid ? 'Change Plan' : 'Upgrade Your Plan'}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-500 text-sm mt-0.5">
            Unlock advanced security features for your code
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── PRO CARD ─────────────────────────── */}
          <div
            className={`relative rounded-xl border p-5 space-y-4 transition-all ${
              isPro
                ? 'border-indigo-500/50 bg-indigo-500/5'
                : 'border-zinc-200 dark:border-[#2a2a2a] hover:border-indigo-500/30'
            }`}
          >
            {isPro && (
              <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-indigo-500 text-white text-xs font-semibold rounded-full">
                Current
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <Zap className="h-4 w-4 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Pro
              </h3>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-zinc-900 dark:text-white">
                $19
              </span>
              <span className="text-zinc-500 dark:text-zinc-500 text-sm">
                /month
              </span>
            </div>

            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                100 scans / month
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                Auto-Fix by KAVACH AI
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                Fix Confidence Scores
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                JSON + Markdown reports
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                One-Click Ignore
              </li>
            </ul>

            <button
              onClick={() =>
                handleCheckout(
                  process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
                  'pro'
                )
              }
              disabled={isPro || loading !== null}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isPro
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
              } disabled:opacity-50`}
            >
              {loading === 'pro' ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecting...
                </span>
              ) : isPro ? (
                'Current Plan'
              ) : (
                'Upgrade to Pro'
              )}
            </button>
          </div>

          {/* ── ENTERPRISE CARD ──────────────────── */}
          <div
            className={`relative rounded-xl border p-5 space-y-4 transition-all ${
              isEnterprise
                ? 'border-amber-500/50 bg-amber-500/5'
                : 'border-zinc-200 dark:border-[#2a2a2a] hover:border-amber-500/30'
            }`}
          >
            {isEnterprise && (
              <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-amber-500 text-black text-xs font-semibold rounded-full">
                Current
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Crown className="h-4 w-4 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                Enterprise
              </h3>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-zinc-900 dark:text-white">
                $99
              </span>
              <span className="text-zinc-500 dark:text-zinc-500 text-sm">
                /month
              </span>
            </div>

            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                Unlimited scans
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                GitHub PR Auto-Push
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                SARIF + all report formats
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                CI/CD Integration
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                Priority support + SLA
              </li>
            </ul>

            <button
              onClick={() =>
                handleCheckout(
                  process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || '',
                  'enterprise'
                )
              }
              disabled={isEnterprise || loading !== null}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
                isEnterprise
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-default'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-amber-500/20'
              } disabled:opacity-50`}
            >
              {loading === 'enterprise' ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecting...
                </span>
              ) : isEnterprise ? (
                'Current Plan'
              ) : (
                'Upgrade to Enterprise'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
