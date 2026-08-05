import { Metadata } from 'next'
import ClientMarketingNavbar from '@/components/marketing/ClientMarketingNavbar'
import FooterMarketing from '@/components/marketing/FooterMarketing'
import * as motion from 'framer-motion/client'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions for using KAVACH, the AI code security analyzer.',
}

export default function TermsOfServicePage() {
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
                    Terms of Service
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
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">1. Acceptance of Terms</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                            By accessing or using KAVACH (&quot;Service&quot;), you agree to be bound by 
                            these Terms of Service (&quot;Terms&quot;). If you disagree with any part, 
                            please do not use the Service.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">2. Description of Service</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                            KAVACH is an open-source security analysis tool that scans code for 
                            vulnerabilities using:
                        </p>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>Static analysis (Semgrep)</li>
                            <li>Secret detection (Gitleaks)</li>
                            <li>AI-powered review (Ollama Qwen 2.5 Coder)</li>
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">3. Account Registration</h2>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>You must sign in with a valid GitHub account</li>
                            <li>You are responsible for maintaining account security</li>
                            <li>One account per user; account sharing is not permitted</li>
                            <li>You must be at least 13 years old to use KAVACH</li>
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">4. Acceptable Use</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">You agree NOT to:</p>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>Upload malicious code intended to harm our systems</li>
                            <li>Attempt to reverse-engineer our AI models</li>
                            <li>Scan code you don&apos;t have permission to analyze</li>
                            <li>Use the Service to violate any laws</li>
                            <li>Abuse rate limits or bypass usage restrictions</li>
                            <li>Impersonate others or provide false information</li>
                            <li>Interfere with other users&apos; access</li>
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">5. User Content</h2>
                        
                        <h3 className="font-heading text-xl font-semibold mt-6 mb-3">5.1 Your Content</h3>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                            You retain ownership of code you upload/paste. By using KAVACH, you 
                            grant us a limited license to:
                        </p>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>Process your code for security analysis</li>
                            <li>Generate reports based on your code</li>
                            <li>Store your code as needed for the Service</li>
                        </ul>

                        <h3 className="font-heading text-xl font-semibold mt-6 mb-3">5.2 Content Restrictions</h3>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">Do not upload:</p>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>Content that violates copyright</li>
                            <li>Personal data of others without consent</li>
                            <li>Illegal content</li>
                            <li>Malware or exploits (except for legitimate security research)</li>
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">6. Service Availability</h2>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>KAVACH is provided &quot;AS IS&quot; without warranties</li>
                            <li>We do not guarantee 100% uptime</li>
                            <li>Scheduled maintenance may cause downtime</li>
                            <li>We may modify or discontinue features with notice</li>
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">7. Free Tier and Limits</h2>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>Free tier: 10 scans per month</li>
                            <li>Rate limit: 5 scans per hour</li>
                            <li>File size limit: 10 MB per upload</li>
                            <li>Repository size limit: 100 MB</li>
                            <li>These limits may change with notice</li>
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">8. Intellectual Property</h2>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>KAVACH&apos;s source code is open-source (MIT License)</li>
                            <li>Our brand name, logo, and design are proprietary</li>
                            <li>Do not use our branding without written permission</li>
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">9. Disclaimer of Warranties</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                            KAVACH IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT 
                            GUARANTEE:
                        </p>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>That all vulnerabilities will be detected</li>
                            <li>Zero false positives in scan results</li>
                            <li>The Service will meet your specific requirements</li>
                            <li>Uninterrupted or error-free operation</li>
                        </ul>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                            Security scanning is a supplementary tool. Always conduct thorough 
                            manual security reviews for production code.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">10. Limitation of Liability</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, KAVACH SHALL NOT BE LIABLE FOR:
                        </p>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>Indirect, incidental, or consequential damages</li>
                            <li>Loss of data or profits</li>
                            <li>Security breaches resulting from missed vulnerabilities</li>
                            <li>Damages exceeding $100 or fees paid in the last 12 months</li>
                        </ul>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">11. Termination</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">We may suspend or terminate your account for:</p>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>Violation of these Terms</li>
                            <li>Abuse or fraudulent activity</li>
                            <li>Extended inactivity (12+ months)</li>
                            <li>Legal requirements</li>
                        </ul>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                            You may delete your account anytime from Settings.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">12. Changes to Terms</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                            We may update these Terms. Continued use after changes constitutes 
                            acceptance. Material changes will be notified via email or banner.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">13. Governing Law</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                            These Terms are governed by the laws of India. Disputes will be 
                            resolved in Indian courts.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">14. Open Source</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
                            KAVACH&apos;s source code is available under the MIT License. See our 
                            GitHub repository for details: <a href="https://github.com/Tauqeer7Khan/Kavach" target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline">https://github.com/Tauqeer7Khan/Kavach</a>
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                    >
                        <h2 className="font-heading text-2xl font-bold mt-10 mb-4">15. Contact</h2>
                        <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">For legal inquiries:</p>
                        <ul className="pl-6 space-y-2 list-disc text-zinc-700 dark:text-zinc-300 mb-4">
                            <li>Email: <a href="mailto:legal@kavach.dev" className="text-purple-600 dark:text-purple-400 hover:underline">legal@kavach.dev</a></li>
                            <li>GitHub: <a href="https://github.com/Tauqeer7Khan/Kavach" target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 hover:underline">https://github.com/Tauqeer7Khan/Kavach</a></li>
                        </ul>
                    </motion.div>
                </div>
            </section>
            
            <FooterMarketing />
        </div>
    )
}
