'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BetaSignupSection() {
    const [email, setEmail] = useState<string>('');
    const [submitted, setSubmitted] = useState<boolean>(false);

    const router = useRouter();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
        e.preventDefault();
        if (email) {
            setSubmitted(true);
            setTimeout(() => {
                router.push('/login');
            }, 1500);
        }
    };

    return (
        <section id="beta-signup" className="py-24 bg-gradient-to-br from-purple-50 to-zinc-50 dark:from-purple-900/10 dark:to-zinc-900/10 border-t border-zinc-200 dark:border-zinc-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="max-w-2xl mx-auto px-4 text-center relative z-10">
                <div className="inline-block bg-purple-100 dark:bg-[#7C3AED]/20 text-purple-700 dark:text-purple-300 px-4 py-1.5 rounded-full text-sm font-heading font-semibold mb-6 border border-purple-200 dark:border-purple-500/30">
                    🚀 Currently in Private Beta
                </div>

                <h2 className="text-4xl md:text-5xl font-heading font-bold text-[#18181B] dark:text-[#FAFAF9] tracking-tight mb-4">
                    Get early access to KAVACH
                </h2>
                <p className="text-lg font-body text-zinc-600 dark:text-zinc-400 mb-10">
                    Join the waitlist. We&apos;ll email you when your invite is ready.
                </p>

                {!submitted ? (
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            className="flex-1 px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#09090B] text-[#18181B] dark:text-white font-body focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent outline-none transition-shadow shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-none"
                        />
                        <button
                            type="submit"
                            className="bg-gradient-to-b from-[#8B5CF6] to-[#7C3AED] text-white px-6 py-3 rounded-xl font-heading font-semibold transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/25 whitespace-nowrap btn-ripple"
                        >
                            Get Access
                        </button>
                    </form>
                ) : (
                    <div className="bg-emerald-100 dark:bg-[#34D399]/20 text-emerald-800 dark:text-[#34D399] px-6 py-4 rounded-xl inline-block border border-emerald-200 dark:border-[#34D399]/30 font-heading font-medium">
                        ✅ You&apos;re on the list! We&apos;ll email you soon.
                    </div>
                )}

                <p className="mt-6 text-sm font-mono text-zinc-500">
                    No spam · Unsubscribe anytime · Priority access for early signups
                </p>
            </div>
        </section>
    );
}
