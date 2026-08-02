import Link from 'next/link'
import * as Icons from './LandingIcons'

export default function FooterMarketing() {
    return (
        <footer className="bg-white dark:bg-[#09090B] border-t border-zinc-200 dark:border-zinc-800 pt-16 pb-8 relative overflow-hidden">
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
                            <li><Link href="#features" className="hover:text-[#7C3AED] transition-colors">Features</Link></li>
                            <li><Link href="#" className="hover:text-[#7C3AED] transition-colors">Changelog</Link></li>
                            <li><Link href="#" className="hover:text-[#7C3AED] transition-colors">Integrations</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-heading font-semibold text-[#18181B] dark:text-[#FAFAF9] mb-4">Resources</h4>
                        <ul className="space-y-2 font-mono text-sm text-zinc-600 dark:text-zinc-400">
                            <li><Link href="#" className="hover:text-[#7C3AED] transition-colors">Documentation</Link></li>
                            <li><Link href="#" className="hover:text-[#7C3AED] transition-colors">Security Blog</Link></li>
                            <li><Link href="#faq" className="hover:text-[#7C3AED] transition-colors">FAQ</Link></li>
                            <li><Link href="#" className="hover:text-[#7C3AED] transition-colors">API Reference</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-heading font-semibold text-[#18181B] dark:text-[#FAFAF9] mb-4">Connect</h4>
                        <div className="flex space-x-4 mb-4">
                            <a href="#" className="text-zinc-400 hover:text-[#18181B] dark:hover:text-white transition-colors"><Icons.Github className="h-5 w-5" /></a>
                            <a href="#" className="text-zinc-400 hover:text-[#18181B] dark:hover:text-white transition-colors">
                                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
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
                        <Link href="#" className="hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors">Privacy Policy</Link>
                        <Link href="#" className="hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
