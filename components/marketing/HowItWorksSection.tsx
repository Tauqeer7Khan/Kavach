'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import * as Icons from './LandingIcons'

// ── Card 1 mock: pulsing <> icon + blinking cursor ──────────────────────────
function PasteMock() {
    return (
        <div className="mt-6 bg-zinc-50 dark:bg-[#09090B] rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 shadow-inner">
            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-md p-6 text-center">
                <motion.div
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex justify-center mb-2"
                >
                    <Icons.Code2 className="h-6 w-6 text-zinc-400" />
                </motion.div>
                <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-xs font-mono text-zinc-500"
                >
                    Cmd+V to paste
                </motion.span>
            </div>
        </div>
    )
}

// ── Card 2 mock: looping progress bar + animated "Scanning..." dots ──────────
function AnalysisMock() {
    const [dots, setDots] = useState('')
    useEffect(() => {
        const id = setInterval(() => {
            setDots(d => (d.length >= 3 ? '' : d + '.'))
        }, 500)
        return () => clearInterval(id)
    }, [])

    return (
        <div className="mt-6 bg-zinc-50 dark:bg-[#09090B] rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 shadow-inner">
            <div className="space-y-3">
                <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] rounded-full"
                        animate={{ width: ['0%', '69%'] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.8 }}
                    />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>Scanning{dots}</span>
                    <motion.span
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        69%
                    </motion.span>
                </div>
            </div>
        </div>
    )
}

// ── Card 3 mock: pulsing green check + shine button ─────────────────────────
function FixMock() {
    return (
        <div className="mt-6 bg-zinc-50 dark:bg-[#09090B] rounded-lg border border-[#34D399]/30 p-4 shadow-inner">
            <div className="flex items-center space-x-2 mb-3">
                <motion.div
                    animate={{
                        boxShadow: [
                            '0 0 0px 0px rgba(52,211,153,0)',
                            '0 0 8px 3px rgba(52,211,153,0.5)',
                            '0 0 0px 0px rgba(52,211,153,0)',
                        ],
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="rounded-full"
                >
                    <Icons.CheckCircle2 className="h-4 w-4 text-[#34D399]" />
                </motion.div>
                <span className="text-xs font-mono font-medium text-emerald-700 dark:text-[#34D399]">
                    READY TO PATCH
                </span>
            </div>

            {/* Shine button */}
            <motion.button
                whileHover={{ scale: 1.02, boxShadow: '0 0 12px 2px rgba(124,58,237,0.4)' }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="relative w-full bg-[#18181B] dark:bg-[#1A1A1A] text-white text-xs py-2 rounded font-heading font-medium border border-zinc-700 dark:border-zinc-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] overflow-hidden"
            >
                <span className="relative z-10">Apply Secure Code</span>
                {/* Shine sweep */}
                <motion.div
                    className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
                />
            </motion.button>
        </div>
    )
}

// ── Main section ─────────────────────────────────────────────────────────────
export default function HowItWorksSection() {
    const steps = [
        {
            emoji: <Icons.Clipboard className="h-6 w-6 text-[#7C3AED]" />,
            title: 'Paste or Upload',
            desc: 'Connect your GitHub repo, paste snippets, or upload files directly into the dashboard.',
            mock: <PasteMock />,
        },
        {
            emoji: <Icons.Search className="h-6 w-6 text-[#7C3AED]" />,
            title: 'Get Instant Analysis',
            desc: 'Our engine combines Semgrep static analysis with custom LLM evaluation models.',
            mock: <AnalysisMock />,
        },
        {
            emoji: <Icons.Wrench className="h-6 w-6 text-[#7C3AED]" />,
            title: 'Apply Secure Fixes',
            desc: 'Review context-aware fix suggestions and apply them with a single click.',
            mock: <FixMock />,
        },
    ]

    return (
        <section className="py-24 bg-[#FAFAF9] dark:bg-[#09090B] transition-colors" id="how-it-works">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#18181B] dark:text-[#FAFAF9]">
                        Security in 3 simple steps
                    </h2>
                    <p className="mt-4 text-lg font-body text-zinc-600 dark:text-zinc-400">
                        No complex integrations or lengthy setups required.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 relative">
                    <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent z-0" />

                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-100px' }}
                            transition={{ duration: 0.6, delay: index * 0.15 }}
                            whileHover={{
                                y: -4,
                                boxShadow: '0 8px 30px -4px rgba(124,58,237,0.25)',
                                borderColor: 'rgba(124,58,237,0.5)',
                            }}
                            className="bg-white dark:bg-[#111111] rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm relative z-10 unique-card transition-colors duration-300 cursor-default"
                        >
                            <div className="w-12 h-12 bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center text-2xl mb-6 mx-auto md:mx-0 shadow-inner transition-colors">
                                {step.emoji}
                            </div>

                            <h3 className="text-xl font-heading font-bold text-[#18181B] dark:text-[#FAFAF9] mb-3 text-center md:text-left">
                                {step.title}
                            </h3>
                            <p className="font-body text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed text-center md:text-left min-h-[60px]">
                                {step.desc}
                            </p>

                            {step.mock}
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
