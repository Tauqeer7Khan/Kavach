'use client';

import { useState } from 'react';
import { Gift, Loader2, CheckCircle, XCircle } from 'lucide-react';

export function CouponSection() {
  const [couponCode, setCouponCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRedeem = async () => {
    if (!couponCode.trim()) {
      setMessage({ type: 'error', text: 'Please enter a coupon code.' });
      return;
    }

    setIsRedeeming(true);
    setMessage(null);

    try {
      const response = await fetch('/api/coupon/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: '🎉 Welcome to Enterprise! You now have unlimited scans.',
        });
        setCouponCode('');
        // Reload page after short delay so plan badge refreshes
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Invalid coupon code.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#111111] border border-zinc-200 dark:border-[#1f1f1f] rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-purple-500" />
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
          Have a Coupon Code?
        </h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 -mt-1">
        Enter your exclusive code to unlock Enterprise features
      </p>

      <div className="flex gap-2">
        <input
          id="coupon-input"
          type="text"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && !isRedeeming && handleRedeem()}
          placeholder="Enter coupon code"
          className="flex-1 bg-zinc-100 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-[#2a2a2a] rounded-lg px-3 py-2 text-sm font-mono text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
          disabled={isRedeeming}
        />
        <button
          id="coupon-redeem-btn"
          onClick={handleRedeem}
          disabled={isRedeeming}
          className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {isRedeeming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Redeeming…
            </>
          ) : (
            'Redeem'
          )}
        </button>
      </div>

      {message && (
        <div
          className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}
    </div>
  );
}
