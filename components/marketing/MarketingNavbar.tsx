'use client'
import { useState } from 'react'
import Link from 'next/link'
import * as Icons from './LandingIcons'

interface MarketingNavbarProps {
  isDark: boolean
  toggleTheme: () => void
}

export default function MarketingNavbar({ isDark, toggleTheme }: MarketingNavbarProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#FAFAF9]/80 dark:bg-[#09090B]/80 border-b border-zinc-200 dark:border-zinc-800 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-md filter drop-shadow-[0_0_8px_rgba(139,92,246,0.4)]">
                            <Icons.KavachLogo className="h-7 w-7" />
                        </div>
                        <span className="font-heading font-bold text-xl tracking-tight text-[#18181B] dark:text-[#FAFAF9]">
                            KAVACH
                        </span>
                        <span className="font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded ml-2 mt-1 border border-zinc-200 dark:border-zinc-700">
                            BETA
                        </span>
                    </div>

                    <div className="hidden md:flex items-center space-x-8 text-sm font-body font-medium text-zinc-600 dark:text-zinc-300">
                        {['Features', 'How it Works', 'FAQ'].map(item => (
                            <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="group relative hover:text-[#7C3AED] transition-colors">
                                {item}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#7C3AED] transition-all group-hover:w-full rounded-full"></span>
                            </a>
                        ))}
                    </div>

                    <div className="hidden md:flex items-center space-x-4">
                        <a href="https://github.com/Tauqeer7Khan" target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-[#18181B] dark:hover:text-white transition-colors">
                            <Icons.Github className="h-5 w-5" />
                        </a>
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors text-zinc-500 dark:text-zinc-400"
                            aria-label="Toggle Theme"
                        >
                            {isDark ? <Icons.Sun className="h-5 w-5" /> : <Icons.Moon className="h-5 w-5" />}
                        </button>
                        <Link href="/login">
                          <button className="bg-gradient-to-b from-[#8B5CF6] to-[#7C3AED] text-white px-5 py-2.5 rounded-lg font-heading font-semibold text-sm transition-all shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/25 btn-ripple">
                              Try Free
                          </button>
                        </Link>
                    </div>

                    <div className="md:hidden flex items-center">
                        <button
                            onClick={toggleTheme}
                            className="p-2 mr-2 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors text-zinc-500 dark:text-zinc-400"
                        >
                            {isDark ? <Icons.Sun className="h-5 w-5" /> : <Icons.Moon className="h-5 w-5" />}
                        </button>
                        <button onClick={() => setIsOpen(!isOpen)} className="text-zinc-600 dark:text-zinc-300">
                            {isOpen ? <Icons.X className="h-6 w-6" /> : <Icons.Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Dropdown */}
            <div className={`md:hidden bg-[#FAFAF9] dark:bg-[#09090B] border-b border-zinc-200 dark:border-zinc-800 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-4 pt-2 pb-6 space-y-4 flex flex-col font-body">
                    <a href="#features" onClick={() => setIsOpen(false)} className="text-zinc-600 dark:text-zinc-300 py-2 border-b border-zinc-100 dark:border-zinc-800">Features</a>
                    <a href="#how-it-works" onClick={() => setIsOpen(false)} className="text-zinc-600 dark:text-zinc-300 py-2 border-b border-zinc-100 dark:border-zinc-800">How it Works</a>
                    <a href="#faq" onClick={() => setIsOpen(false)} className="text-zinc-600 dark:text-zinc-300 py-2 border-b border-zinc-100 dark:border-zinc-800">FAQ</a>
                    <Link href="/login">
                      <button className="w-full bg-gradient-to-b from-[#8B5CF6] to-[#7C3AED] text-white px-4 py-2.5 rounded-lg font-heading font-semibold mt-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]">
                          Try Free
                      </button>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
