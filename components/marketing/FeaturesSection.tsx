import { SVGProps } from 'react'
import * as Icons from './LandingIcons'
import Reveal from './Reveal'

interface Feature {
  icon: React.ComponentType<SVGProps<SVGSVGElement>>
  color: string
  bg: string
  title: string
  desc: string
  tag: string
}

export default function FeaturesSection() {
    const features: Feature[] = [
        { icon: Icons.Bug, color: 'text-[#F87171]', bg: 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20', title: 'SQL Injection', desc: "Ensure database queries won't be hijacked by malicious inputs.", tag: '[CRITICAL]' },
        { icon: Icons.Key, color: 'text-[#FBBF24]', bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20', title: 'Hardcoded Secrets', desc: 'LLMs often generate dummy API keys that end up in production.', tag: '[HIGH]' },
        { icon: Icons.Zap, color: 'text-[#34D399]', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20', title: 'Command Injection', desc: 'Prevent arbitrary code execution from unsanitized parameters.', tag: '[CRITICAL]' },
        { icon: Icons.ShieldOff, color: 'text-[#8B5CF6]', bg: 'bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20', title: 'XSS Attacks', desc: 'Stop cross-site scripting in AI-generated React/Vue components.', tag: '[HIGH]' },
        { icon: Icons.Lock, color: 'text-[#60A5FA]', bg: 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20', title: 'Insecure Auth', desc: 'Catch weak hashing algorithms and broken JWT implementations.', tag: '[MEDIUM]' },
        { icon: Icons.FileWarning, color: 'text-[#F472B6]', bg: 'bg-pink-50 dark:bg-pink-500/10 border-pink-100 dark:border-pink-500/20', title: 'Path Traversal', desc: 'Block access to sensitive system files via user input.', tag: '[HIGH]' }
    ];

    return (
        <section className="py-24 bg-[#FAFAF9] dark:bg-[#09090B] border-t border-zinc-200 dark:border-zinc-800" id="features">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181B] px-4 py-1.5 text-sm font-mono text-zinc-600 dark:text-zinc-400 mb-6 shadow-sm">
                        OWASP Top 10 Coverage
                    </div>
                    <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#18181B] dark:text-[#FAFAF9]">We catch what LLMs miss</h2>
                    <p className="mt-4 text-lg font-body text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
                        AI models are trained on billions of lines of code—including insecure ones. KAVACH acts as a safety net before that code hits production.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, i) => (
                        <Reveal key={i} delay={i * 100}>
                            <div className="bg-white dark:bg-[#18181B] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all group card-hover">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-xl border ${feature.bg} ${feature.color} transition-transform group-hover:scale-110`}>
                                        <feature.icon className="h-6 w-6" />
                                    </div>
                                    <span className={`text-xs font-mono font-medium ${feature.color}`}>{feature.tag}</span>
                                </div>
                                <h3 className="text-xl font-heading font-semibold text-[#18181B] dark:text-[#FAFAF9] mb-2">{feature.title}</h3>
                                <p className="font-body text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">{feature.desc}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
