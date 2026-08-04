import { Metadata } from 'next'
import ClientMarketingNavbar from '@/components/marketing/ClientMarketingNavbar'
import FooterMarketing from '@/components/marketing/FooterMarketing'
import { Shield, Key, Brain, FileSearch, CheckCircle2, List, Globe, Lock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Features',
  description: 'Everything you need to secure AI-generated code. Features include Static Analysis, Secret Detection, AI Deep Review, and more.',
}

export default function FeaturesPage() {
    const features = [
        { icon: FileSearch, title: 'Static Analysis', desc: 'Semgrep-powered pattern detection to catch common syntax and structural vulnerabilities instantly.', benefit: 'Lightning fast initial scan' },
        { icon: Key, title: 'Secret Detection', desc: 'Gitleaks integration plus custom regex to find API keys, passwords, and tokens before they hit production.', benefit: 'Prevents leaked credentials' },
        { icon: Brain, title: 'AI Deep Review', desc: 'Local Llama 3.1 analyzes complex logic flaws and context-dependent vulnerabilities that static tools miss.', benefit: 'Understands code intent' },
        { icon: Shield, title: 'Security Scoring', desc: 'Get a clear 0-100 score and A-F grading for your repository to track improvements over time.', benefit: 'Quantifiable metrics' },
        { icon: CheckCircle2, title: 'Fix Suggestions', desc: 'Receive exact fixed code snippets along with detailed AI explanations on why the fix is necessary.', benefit: 'One-click remediation' },
        { icon: List, title: 'OWASP Top 10 Mapping', desc: 'Vulnerabilities are automatically categorized according to the OWASP Top 10 framework.', benefit: 'Compliance ready' },
        { icon: Globe, title: 'Multi-language Support', desc: 'Out-of-the-box support for 12 popular programming languages including TS/JS, Python, Go, and Rust.', benefit: 'Works with your stack' },
        { icon: Lock, title: 'Privacy First', desc: 'KAVACH can run entirely locally. Your code is never sent to third-party APIs or external servers.', benefit: 'Zero data retention' },
    ]

    return (
        <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#09090B] text-[#18181B] dark:text-[#FAFAF9] transition-colors duration-300 font-body selection:bg-[#7C3AED]/30 flex flex-col">
            <ClientMarketingNavbar />
            
            <main className="flex-1">
                <section className="max-w-6xl mx-auto px-6 pt-32 pb-16">
                    <h1 className="font-heading text-5xl md:text-6xl font-bold mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        Everything you need to secure AI-generated code
                    </h1>
                    <p className="text-lg text-zinc-600 dark:text-zinc-900 dark:text-white/60 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
                        KAVACH combines the speed of static analysis with the contextual understanding of large language models to provide unparalleled security for modern codebases.
                    </p>
                </section>

                <section className="max-w-6xl mx-auto px-6 pb-24">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, i) => (
                            <div 
                                key={i} 
                                className="bg-white dark:bg-[#111111] p-8 rounded-2xl border border-zinc-200 dark:border-white/10 shadow-sm hover:border-[#7C3AED]/50 transition-colors duration-300 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both"
                                style={{ animationDelay: `${(i + 2) * 100}ms` }}
                            >
                                <div className="w-12 h-12 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl flex items-center justify-center mb-6">
                                    <feature.icon className="h-6 w-6 text-[#7C3AED]" />
                                </div>
                                <h3 className="text-xl font-heading font-bold text-zinc-900 dark:text-white mb-3">{feature.title}</h3>
                                <p className="text-zinc-600 dark:text-zinc-900 dark:text-white/60 text-sm leading-relaxed flex-grow mb-6">{feature.desc}</p>
                                <div className="text-xs font-mono text-[#7C3AED] bg-[#7C3AED]/10 inline-block px-3 py-1 rounded-full self-start">
                                    {feature.benefit}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            <FooterMarketing />
        </div>
    )
}
