import Link from 'next/link'
import * as Icons from './LandingIcons'

export default function FooterMarketing() {
    return (
        <footer className="bg-white dark:bg-[#09090B] border-t border-zinc-200 dark:border-zinc-800 pt-16 pb-8 relative overflow-hidden transition-colors">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent opacity-20"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid md:grid-cols-4 gap-8 mb-12">
                    <div className="md:col-span-1">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="p-1 rounded-md">
                                <Icons.KavachLogo className="h-6 w-6" />
                            </div>
                            <span className="font-heading font-bold text-lg text-[#18181B] dark:text-[#FAFAF9]">KAVACH</span>
                        </div>
                        <p className="font-body text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
                            AI code security for modern development teams. Ship fast, stay safe.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-heading font-semibold text-[#18181B] dark:text-[#FAFAF9] mb-4">Product</h4>
                        <ul className="space-y-2 font-mono text-sm text-zinc-600 dark:text-zinc-400">
                            <li><Link href="/product/features" className="hover:text-[#7C3AED] hover:translate-x-1 transition-all inline-block">Features</Link></li>
                            <li><Link href="/product/changelog" className="hover:text-[#7C3AED] hover:translate-x-1 transition-all inline-block">Changelog</Link></li>
                            <li><Link href="/product/integrations" className="hover:text-[#7C3AED] hover:translate-x-1 transition-all inline-block">Integrations</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-heading font-semibold text-[#18181B] dark:text-[#FAFAF9] mb-4">Resources</h4>
                        <ul className="space-y-2 font-mono text-sm text-zinc-600 dark:text-zinc-400">
                            <li><Link href="/resources/documentation" className="hover:text-[#7C3AED] hover:translate-x-1 transition-all inline-block">Documentation</Link></li>
                            <li><Link href="/resources/security-blog" className="hover:text-[#7C3AED] hover:translate-x-1 transition-all inline-block">Security Blog</Link></li>
                            <li><Link href="/#faq" className="hover:text-[#7C3AED] hover:translate-x-1 transition-all inline-block">FAQ</Link></li>
                            <li><Link href="/resources/api-reference" className="hover:text-[#7C3AED] hover:translate-x-1 transition-all inline-block">API Reference</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-heading font-semibold text-[#18181B] dark:text-[#FAFAF9] mb-4">Connect</h4>
                        <div className="flex space-x-4 mb-4">
                            <a href="https://github.com/Tauqeer7Khan/Kavach" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-[#7C3AED] hover:scale-110 transition-all"><Icons.Github className="h-5 w-5" /></a>
                            <a href="https://www.linkedin.com/in/tauqeer7khan" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-[#7C3AED] hover:scale-110 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                            </a>
                        </div>
                        <p className="font-body text-sm text-zinc-500">Made with ❤️ for indie hackers.</p>
                    </div>
                </div>

                {/* HUGE WORDMARK */}
                <div className="w-full text-center overflow-hidden mb-8 mt-12 opacity-5 dark:opacity-10 pointer-events-none select-none">
                    <h1 className="text-[15vw] leading-none font-accent italic font-bold tracking-tighter text-[#18181B] dark:text-[#FAFAF9] m-0 p-0">KAVACH</h1>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm font-mono text-zinc-500">
                    <p>© {new Date().getFullYear()} KAVACH Security Inc. All rights reserved.</p>
                    <div className="flex space-x-6 mt-4 md:mt-0">
                        <Link href="/legal/privacy-policy" className="text-zinc-600 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Privacy Policy</Link>
                        <Link href="/legal/terms-of-service" className="text-zinc-600 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
