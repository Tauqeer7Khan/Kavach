import { Metadata } from 'next'
import ClientMarketingNavbar from '@/components/marketing/ClientMarketingNavbar'
import FooterMarketing from '@/components/marketing/FooterMarketing'
import * as motion from 'framer-motion/client'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How we collect, use, and safeguard your information at KAVACH.',
}

export default function PrivacyPolicyPage() {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#09090B] text-[#18181B] dark:text-[#FAFAF9] transition-colors duration-300">
            <ClientMarketingNavbar />
            
            <section className="max-w-4xl mx-auto px-6 pt-32 pb-24">
                <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-heading text-4xl md:text-5xl font-bold mb-2"
                >
                    Privacy Policy
                </motion.h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 mb-12">
                    Last updated: {today}
                </p>
                
                <div className="space-y-10">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">1. Introduction</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                            KAVACH (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your privacy. 
                            This Privacy Policy explains how we collect, use, and safeguard your 
                            information when you use our AI code security scanning service.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">2. Information We Collect</h2>
                        
                        <h3 className="font-heading text-xl font-semibold mt-6 mb-3">2.1 Account Information</h3>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">When you sign in with GitHub OAuth, we collect:</p>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>GitHub username and profile picture</li>
                            <li>Email address (from GitHub)</li>
                            <li>GitHub user ID</li>
                        </ul>

                        <h3 className="font-heading text-xl font-semibold mt-6 mb-3">2.2 Code and Scan Data</h3>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>Code you paste, upload, or link via GitHub repositories</li>
                            <li>Scan results including vulnerabilities detected</li>
                            <li>Metadata: file names, sizes, programming languages, timestamps</li>
                        </ul>

                        <h3 className="font-heading text-xl font-semibold mt-6 mb-3">2.3 Usage Data</h3>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>Number of scans performed</li>
                            <li>Login timestamps</li>
                            <li>Features used</li>
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">3. How We Use Your Information</h2>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>Provide the security scanning service</li>
                            <li>Generate vulnerability reports</li>
                            <li>Improve our detection accuracy (aggregated, anonymized data only)</li>
                            <li>Send service-related notifications</li>
                            <li>Prevent abuse and enforce our Terms of Service</li>
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">4. Data Storage and Security</h2>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li><strong>Local AI Processing</strong>: Code is analyzed locally using Ollama (Qwen 2.5 Coder 14B). Your code is NOT sent to third-party AI services like OpenAI or Anthropic.</li>
                            <li><strong>Encrypted Storage</strong>: All data is encrypted at rest and in transit.</li>
                            <li><strong>File Storage</strong>: Uploaded files stored on Cloudflare R2 with access controls.</li>
                            <li><strong>Database</strong>: PostgreSQL via Supabase with Row Level Security (RLS).</li>
                            <li><strong>Retention</strong>: Scan data retained for 90 days unless you delete it earlier.</li>
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">5. Data Sharing</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">We do NOT sell your data. We share data only:</p>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>With GitHub for authentication (via OAuth)</li>
                            <li>With service providers (Supabase, Vercel, Cloudflare) under strict data processing agreements</li>
                            <li>When required by law</li>
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">6. Third-Party Services</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">KAVACH uses:</p>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li><strong>GitHub</strong> — Authentication and repository access</li>
                            <li><strong>Supabase</strong> — Database and authentication backend</li>
                            <li><strong>Vercel</strong> — Hosting and edge functions</li>
                            <li><strong>Cloudflare R2</strong> — File storage</li>
                            <li><strong>Upstash</strong> — Queue management</li>
                            <li><strong>Google Gemini</strong> — Fallback AI (only if local AI is unavailable)</li>
                        </ul>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">Each service has its own privacy policy.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">7. Your Rights</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">You have the right to:</p>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li><strong>Access</strong> your personal data</li>
                            <li><strong>Delete</strong> your account and all associated data</li>
                            <li><strong>Export</strong> your scan history</li>
                            <li><strong>Opt-out</strong> of non-essential communications</li>
                            <li><strong>Request corrections</strong> to inaccurate data</li>
                        </ul>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                            To exercise these rights, contact us at: <a href="mailto:privacy@kavach.dev" className="text-purple-600 dark:text-purple-400 hover:underline">privacy@kavach.dev</a>
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">8. Cookies and Local Storage</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">We use:</p>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>Session cookies for authentication</li>
                            <li>localStorage for theme preferences</li>
                            <li>No third-party analytics or tracking cookies</li>
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">9. Children&apos;s Privacy</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                            KAVACH is not intended for users under 13. We do not knowingly collect 
                            data from children.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">10. Changes to This Policy</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                            We may update this policy from time to time. Material changes will be 
                            notified via email or a banner on the site. Continued use after changes 
                            constitutes acceptance.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">11. Contact Us</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">For privacy questions:</p>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>Email: <a href="mailto:privacy@kavach.dev" className="text-purple-600 dark:text-purple-400 hover:underline">privacy@kavach.dev</a></li>
                            <li>GitHub: <a href="https://github.com/Tauqeer7Khan/Kavach" target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline">https://github.com/Tauqeer7Khan/Kavach</a></li>
                        </ul>
                    </motion.div>
                </div>
            </section>
            
            <FooterMarketing />
        </div>
    )
}
