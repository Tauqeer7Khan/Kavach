import { Metadata } from 'next'
import ClientMarketingNavbar from '@/components/marketing/ClientMarketingNavbar'
import FooterMarketing from '@/components/marketing/FooterMarketing'
import { GitBranch, Code, PlaySquare, Hash, MessageSquare, Terminal } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Integrations',
  description: 'Connect KAVACH with your workflow. Scan any public/private repo directly from GitHub, GitLab, and more.',
}

export default function IntegrationsPage() {
    const integrations = [
        { icon: GitBranch, name: 'GitHub', desc: 'Scan any public or private repository directly. Automatic PR comments on vulnerabilities.', status: 'Available' },
        { icon: Terminal, name: 'GitLab', desc: 'Native GitLab CI integration for scanning merge requests.', status: 'Coming Soon' },
        { icon: Code, name: 'Bitbucket', desc: 'Bitbucket Pipelines integration for enterprise teams.', status: 'Coming Soon' },
        { icon: Code, name: 'VS Code Extension', desc: 'Scan code locally in your IDE before you even commit.', status: 'Coming Soon' },
        { icon: PlaySquare, name: 'GitHub Actions', desc: 'Drop-in GitHub Action to run KAVACH in your existing CI/CD pipelines.', status: 'Coming Soon' },
        { icon: Hash, name: 'Slack Notifications', desc: 'Get real-time alerts when high-severity vulnerabilities are merged.', status: 'Coming Soon' },
        { icon: MessageSquare, name: 'Discord Webhooks', desc: 'Stream scan results directly into your team discord channels.', status: 'Coming Soon' },
    ]

    return (
        <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#09090B] text-[#18181B] dark:text-[#FAFAF9] transition-colors duration-300 font-body selection:bg-[#7C3AED]/30 flex flex-col">
            <ClientMarketingNavbar />
            
            <main className="flex-1">
                <section className="max-w-6xl mx-auto px-6 pt-32 pb-16">
                    <h1 className="font-heading text-5xl md:text-6xl font-bold mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        Connect KAVACH with your workflow
                    </h1>
                    <p className="text-lg text-zinc-600 dark:text-zinc-900 dark:text-white/60 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
                        Security should be frictionless. We integrate directly into the tools your team already uses every day.
                    </p>
                </section>

                <section className="max-w-6xl mx-auto px-6 pb-24">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {integrations.map((integration, i) => (
                            <div 
                                key={i} 
                                className="bg-white dark:bg-[#111111] p-8 rounded-2xl border border-zinc-200 dark:border-white/10 shadow-sm hover:border-[#7C3AED]/50 transition-colors duration-300 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
                                style={{ animationDelay: `${(i + 2) * 100}ms` }}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl flex items-center justify-center">
                                        <integration.icon className="h-6 w-6 text-zinc-900 dark:text-white" />
                                    </div>
                                    {integration.status === 'Available' ? (
                                        <span className="text-xs font-mono text-[#34D399] bg-[#34D399]/10 px-3 py-1 rounded-full">
                                            Available
                                        </span>
                                    ) : (
                                        <span className="text-xs font-mono text-[#7C3AED] bg-[#7C3AED]/10 px-3 py-1 rounded-full">
                                            Coming Soon
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-xl font-heading font-bold text-zinc-900 dark:text-white mb-3">{integration.name}</h3>
                                <p className="text-zinc-600 dark:text-zinc-900 dark:text-white/60 text-sm leading-relaxed flex-grow">{integration.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <FooterMarketing />
        </div>
    )
}
