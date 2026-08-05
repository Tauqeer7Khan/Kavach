import { Metadata } from 'next'
import ClientMarketingNavbar from '@/components/marketing/ClientMarketingNavbar'
import FooterMarketing from '@/components/marketing/FooterMarketing'
import { ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Security Blog',
  description: 'AI Code Security Insights and articles on keeping your AI-generated code secure.',
}

export default function SecurityBlogPage() {
    const posts = [
        {
            title: "Why AI-Generated Code is 40% More Vulnerable",
            date: "August 12, 2026",
            readTime: "5 min read",
            excerpt: "A recent Stanford research study revealed that developers using AI assistants like GitHub Copilot wrote significantly less secure code than those who didn't. We break down the reasons why.",
            gradient: "from-blue-500/20 to-purple-500/20"
        },
        {
            title: "The Top 5 Security Mistakes ChatGPT Makes",
            date: "July 28, 2026",
            readTime: "8 min read",
            excerpt: "From SQL injection via string concatenation to hardcoded dummy API keys, we analyze the most common vulnerabilities introduced when prompting LLMs for code snippets.",
            gradient: "from-red-500/20 to-orange-500/20"
        },
        {
            title: "Local AI vs Cloud AI for Security Scanning",
            date: "July 15, 2026",
            readTime: "6 min read",
            excerpt: "Why KAVACH uses a local instance of Qwen 2.5 Coder. Learn the privacy implications of sending your proprietary, unreleased source code to third-party APIs for vulnerability scanning.",
            gradient: "from-emerald-500/20 to-teal-500/20"
        },
        {
            title: "OWASP Top 10 in the Age of AI Coding",
            date: "June 30, 2026",
            readTime: "10 min read",
            excerpt: "The threat landscape is shifting. How the traditional OWASP Top 10 maps to the new reality of AI-assisted development, and what security teams need to look out for.",
            gradient: "from-purple-500/20 to-pink-500/20"
        }
    ]

    return (
        <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#09090B] text-[#18181B] dark:text-[#FAFAF9] transition-colors duration-300 font-body selection:bg-[#7C3AED]/30 flex flex-col">
            <ClientMarketingNavbar />
            
            <main className="flex-1">
                <section className="max-w-6xl mx-auto px-6 pt-32 pb-16">
                    <h1 className="font-heading text-5xl md:text-6xl font-bold mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        AI Code Security Insights
                    </h1>
                    <p className="text-lg text-zinc-600 dark:text-zinc-900 dark:text-white/60 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
                        Thoughts, research, and technical guides on navigating the intersection of artificial intelligence and application security.
                    </p>
                </section>

                <section className="max-w-6xl mx-auto px-6 pb-24">
                    <div className="grid md:grid-cols-2 gap-8">
                        {posts.map((post, i) => (
                            <article 
                                key={i} 
                                className="group bg-white dark:bg-[#111111] rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden hover:border-[#7C3AED]/50 transition-colors duration-300 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both cursor-pointer"
                                style={{ animationDelay: `${(i + 2) * 100}ms` }}
                            >
                                <div className={`h-48 w-full bg-gradient-to-br ${post.gradient} group-hover:scale-105 transition-transform duration-500`}></div>
                                <div className="p-8 flex flex-col flex-grow">
                                    <div className="flex items-center text-xs font-mono text-zinc-500 dark:text-zinc-900 dark:text-white/40 mb-4 space-x-4">
                                        <span>{post.date}</span>
                                        <span>•</span>
                                        <span>{post.readTime}</span>
                                    </div>
                                    <h3 className="text-2xl font-heading font-bold text-zinc-900 dark:text-white mb-3 group-hover:text-[#7C3AED] transition-colors">{post.title}</h3>
                                    <p className="text-zinc-600 dark:text-zinc-900 dark:text-white/60 text-sm leading-relaxed flex-grow mb-6">{post.excerpt}</p>
                                    <div className="flex items-center text-[#7C3AED] text-sm font-semibold mt-auto">
                                        Read Article <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    <div className="mt-16 text-center border-t border-zinc-200 dark:border-white/10 pt-16 animate-in fade-in duration-700 delay-700 fill-mode-both">
                        <p className="font-mono text-zinc-500 dark:text-zinc-900 dark:text-white/40">More posts coming soon...</p>
                    </div>
                </section>
            </main>

            <FooterMarketing />
        </div>
    )
}
