import { Metadata } from 'next'
import ClientMarketingNavbar from '@/components/marketing/ClientMarketingNavbar'
import FooterMarketing from '@/components/marketing/FooterMarketing'
import { GitCommit } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'The 7-day public build of KAVACH.',
}

export default function ChangelogPage() {
    const logs = [
        { version: 'v1.0.0', day: 'Day 7', date: 'Launch Day', title: '🚀 LAUNCHED on Vercel!', changes: ['Deployed frontend to Vercel', 'Configured production environment variables', 'Finalized E2E testing checklist', 'Polished all marketing assets'] },
        { version: 'v0.6.0', day: 'Day 6', date: 'Polish Day', title: 'Polish + Error Handling', changes: ['Added global error boundaries', 'Created 404 pages and skeleton states', 'Added SEO metadata to all routes', 'Suppressed build warnings and optimized images'] },
        { version: 'v0.5.0', day: 'Day 5', date: 'UI Day', title: 'Full Dashboard + Landing Page', changes: ['Built complete landing page with 14 marketing components', 'Implemented purple theme design system', 'Added auto-playing security demo', 'Built 6 dashboard pages with real-time progress'] },
        { version: 'v0.4.0', day: 'Day 4', date: 'API Day', title: 'API Routes + File Upload', changes: ['Implemented R2 Cloudflare bucket for file uploads', 'Added GitHub validation API', 'Created code paste parsing logic'] },
        { version: 'v0.3.0', day: 'Day 3', date: 'Scanner Day', title: 'Security Scanner Pipeline', changes: ['Integrated Semgrep for static analysis', 'Added Ollama Qwen 2.5 Coder for deep review', 'Implemented Gitleaks for secret detection', 'Wired BullMQ for background jobs'] },
        { version: 'v0.2.0', day: 'Day 2', date: 'Auth Day', title: 'GitHub OAuth + Backend', changes: ['Set up Supabase Auth with GitHub provider', 'Configured Upstash Redis for caching', 'Added Prisma ORM connection'] },
        { version: 'v0.1.0', day: 'Day 1', date: 'Foundation', title: 'Foundation & Database Schema', changes: ['Initialized Next.js 14 project', 'Created initial Supabase database schema', 'Set up Tailwind CSS and Lucide icons'] },
    ]

    return (
        <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#09090B] text-[#18181B] dark:text-[#FAFAF9] transition-colors duration-300 font-body selection:bg-[#7C3AED]/30 flex flex-col">
            <ClientMarketingNavbar />
            
            <main className="flex-1">
                <section className="max-w-6xl mx-auto px-6 pt-32 pb-16">
                    <h1 className="font-heading text-5xl md:text-6xl font-bold mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        The 7-day public build
                    </h1>
                    <p className="text-lg text-zinc-600 dark:text-zinc-900 dark:text-white/60 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
                        Track the journey of building KAVACH from a blank canvas to a fully functional AI code security platform in just one week.
                    </p>
                </section>

                <section className="max-w-4xl mx-auto px-6 pb-24">
                    <div className="relative border-l-2 border-[#7C3AED]/20 ml-4 md:ml-6 space-y-12">
                        {logs.map((log, i) => (
                            <div 
                                key={i} 
                                className="relative pl-8 md:pl-12 animate-in fade-in slide-in-from-left-8 duration-700 fill-mode-both"
                                style={{ animationDelay: `${(i + 2) * 100}ms` }}
                            >
                                <div className="absolute -left-[25px] top-1 bg-white dark:bg-[#111111] border-2 border-[#7C3AED] rounded-full p-2">
                                    <GitCommit className="h-4 w-4 text-[#7C3AED]" />
                                </div>
                                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                                    <span className="font-mono text-sm bg-purple-100 dark:bg-[#7C3AED]/10 text-purple-700 dark:text-[#7C3AED] px-3 py-1 rounded-full w-fit">
                                        {log.version}
                                    </span>
                                    <span className="text-zinc-500 dark:text-zinc-900 dark:text-white/40 text-sm font-mono">{log.day} · {log.date}</span>
                                </div>
                                <h3 className="text-2xl font-heading font-bold text-zinc-900 dark:text-white mb-4">{log.title}</h3>
                                <ul className="space-y-3">
                                    {log.changes.map((change, j) => (
                                        <li key={j} className="flex items-start text-zinc-600 dark:text-zinc-900 dark:text-white/70">
                                            <span className="text-[#7C3AED] mr-3 mt-1">•</span>
                                            <span>{change}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <FooterMarketing />
        </div>
    )
}
