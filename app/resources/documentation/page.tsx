import { Metadata } from 'next'
import ClientMarketingNavbar from '@/components/marketing/ClientMarketingNavbar'
import FooterMarketing from '@/components/marketing/FooterMarketing'

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Learn how to use KAVACH to secure your AI-generated code.',
}

export default function DocumentationPage() {
    return (
        <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#09090B] text-[#18181B] dark:text-[#FAFAF9] transition-colors duration-300 font-body selection:bg-[#7C3AED]/30 flex flex-col">
            <ClientMarketingNavbar />
            
            <main className="flex-1">
                <section className="max-w-6xl mx-auto px-6 pt-32 pb-16">
                    <h1 className="font-heading text-5xl md:text-6xl font-bold mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        Learn how to use KAVACH
                    </h1>
                    <p className="text-lg text-zinc-600 dark:text-zinc-900 dark:text-white/60 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
                        Comprehensive guides and documentation to help you start scanning and securing your codebases instantly.
                    </p>
                </section>

                <section className="max-w-6xl mx-auto px-6 pb-24 flex flex-col md:flex-row gap-12">
                    {/* Sidebar */}
                    <div className="md:w-64 flex-shrink-0 animate-in fade-in slide-in-from-left-4 duration-700 delay-300 fill-mode-both">
                        <div className="sticky top-24">
                            <h4 className="font-mono text-sm text-[#7C3AED] mb-4">ON THIS PAGE</h4>
                            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-900 dark:text-white/60 font-body">
                                <li><a href="#getting-started" className="hover:text-zinc-900 dark:text-white transition-colors">Getting Started</a></li>
                                <li><a href="#types-of-scans" className="hover:text-zinc-900 dark:text-white transition-colors">Types of Scans</a></li>
                                <li><a href="#understanding-report" className="hover:text-zinc-900 dark:text-white transition-colors">Understanding Your Report</a></li>
                                <li><a href="#vulnerability-categories" className="hover:text-zinc-900 dark:text-white transition-colors">Vulnerability Categories</a></li>
                                <li><a href="#fixing-issues" className="hover:text-zinc-900 dark:text-white transition-colors">Fixing Issues</a></li>
                                <li><a href="#best-practices" className="hover:text-zinc-900 dark:text-white transition-colors">Best Practices</a></li>
                            </ul>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
                        
                        <div id="getting-started" className="scroll-mt-24">
                            <h2 className="text-3xl font-heading font-bold mb-6">1. Getting Started</h2>
                            <div className="prose prose-invert prose-purple max-w-none text-zinc-600 dark:text-zinc-900 dark:text-white/70">
                                <p className="mb-4">KAVACH is designed to be frictionless. To get started, you don&apos;t need to install any heavy dependencies or configure complex pipelines.</p>
                                <ol className="list-decimal pl-5 space-y-2">
                                    <li>Sign in using your GitHub account on the <a href="/login" className="text-[#7C3AED] hover:underline">login page</a>.</li>
                                    <li>Navigate to your Dashboard.</li>
                                    <li>Click on <strong>New Scan</strong> to initiate your first security review.</li>
                                    <li>Wait for the analysis to complete, and review the generated security report.</li>
                                </ol>
                            </div>
                        </div>

                        <div id="types-of-scans" className="scroll-mt-24">
                            <h2 className="text-3xl font-heading font-bold mb-6">2. Types of Scans</h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-[#111111] p-6 rounded-xl border border-zinc-200 dark:border-white/10">
                                    <h4 className="font-heading font-bold mb-2">Code Snippets</h4>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-900 dark:text-white/60">Paste code directly from ChatGPT or Copilot into our Monaco editor for an instant analysis of that specific block.</p>
                                </div>
                                <div className="bg-white dark:bg-[#111111] p-6 rounded-xl border border-zinc-200 dark:border-white/10">
                                    <h4 className="font-heading font-bold mb-2">File Uploads</h4>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-900 dark:text-white/60">Upload `.js`, `.py`, `.go`, or `.zip` archives. Files are processed securely via Cloudflare R2.</p>
                                </div>
                                <div className="bg-white dark:bg-[#111111] p-6 rounded-xl border border-zinc-200 dark:border-white/10 sm:col-span-2">
                                    <h4 className="font-heading font-bold mb-2">GitHub Repositories</h4>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-900 dark:text-white/60">Connect a public or private GitHub repository URL. KAVACH will clone, scan, and grade the entire project tree.</p>
                                </div>
                            </div>
                        </div>

                        <div id="understanding-report" className="scroll-mt-24">
                            <h2 className="text-3xl font-heading font-bold mb-6">3. Understanding Your Report</h2>
                            <div className="prose prose-invert prose-purple max-w-none text-zinc-600 dark:text-zinc-900 dark:text-white/70">
                                <p>Every scan generates a comprehensive report card:</p>
                                <ul className="list-disc pl-5 space-y-2 mt-4">
                                    <li><strong>Security Score (0-100):</strong> A weighted calculation based on the number and severity of vulnerabilities found.</li>
                                    <li><strong>Grade (A-F):</strong> An easy-to-understand letter grade summarizing the overall health of the code.</li>
                                    <li><strong>Severity Levels:</strong> Issues are flagged as <span className="text-red-400">Critical</span>, <span className="text-amber-400">High</span>, <span className="text-blue-400">Medium</span>, or <span className="text-zinc-400">Low</span>.</li>
                                </ul>
                            </div>
                        </div>

                        <div id="vulnerability-categories" className="scroll-mt-24">
                            <h2 className="text-3xl font-heading font-bold mb-6">4. Vulnerability Categories</h2>
                            <p className="text-zinc-600 dark:text-zinc-900 dark:text-white/70 mb-4">KAVACH maps findings to the OWASP Top 10 framework. Common categories detected include:</p>
                            <div className="space-y-3">
                                <div className="bg-white dark:bg-[#111111] p-4 rounded-lg border border-zinc-200 dark:border-white/10"><strong className="text-zinc-900 dark:text-white">A01: Broken Access Control</strong> — Failure to enforce restrictions on authenticated users.</div>
                                <div className="bg-white dark:bg-[#111111] p-4 rounded-lg border border-zinc-200 dark:border-white/10"><strong className="text-zinc-900 dark:text-white">A02: Cryptographic Failures</strong> — Weak hashing or exposing sensitive data (like API keys).</div>
                                <div className="bg-white dark:bg-[#111111] p-4 rounded-lg border border-zinc-200 dark:border-white/10"><strong className="text-zinc-900 dark:text-white">A03: Injection</strong> — SQL injection, command injection, and cross-site scripting (XSS).</div>
                            </div>
                        </div>

                        <div id="fixing-issues" className="scroll-mt-24">
                            <h2 className="text-3xl font-heading font-bold mb-6">5. Fixing Issues</h2>
                            <p className="text-zinc-600 dark:text-zinc-900 dark:text-white/70 mb-4">When a vulnerability is detected, KAVACH doesn&apos;t just point it out—it provides the solution.</p>
                            <p className="text-zinc-600 dark:text-zinc-900 dark:text-white/70">Expand any vulnerability card in the report to see the <strong>Remediation Strategy</strong>. This includes a clear explanation generated by Qwen 2.5 Coder and an exact, patched code snippet you can copy directly into your codebase.</p>
                        </div>

                        <div id="best-practices" className="scroll-mt-24">
                            <h2 className="text-3xl font-heading font-bold mb-6">6. Best Practices</h2>
                            <ul className="list-disc pl-5 space-y-4 text-zinc-600 dark:text-zinc-900 dark:text-white/70">
                                <li>Always scan AI-generated code <em>before</em> merging it into your main branch.</li>
                                <li>Treat AI models as junior developers; they write functional code, but often overlook edge cases and security boundaries.</li>
                                <li>Do not blindly copy/paste the fix suggestions—review them to ensure they fit your specific application context.</li>
                            </ul>
                        </div>

                    </div>
                </section>
            </main>

            <FooterMarketing />
        </div>
    )
}
