import * as Icons from './LandingIcons'
import Reveal from './Reveal'

export default function HowItWorksSection() {
    const steps = [
        {
            emoji: <Icons.Clipboard className="h-6 w-6 text-[#7C3AED]" />,
            title: "Paste or Upload",
            desc: "Connect your GitHub repo, paste snippets, or upload files directly into the dashboard.",
            mock: (
                <div className="mt-6 bg-zinc-50 dark:bg-[#09090B] rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 shadow-inner">
                    <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-md p-6 text-center">
                        <Icons.Code2 className="mx-auto h-6 w-6 text-zinc-400 mb-2" />
                        <span className="text-xs font-mono text-zinc-500">Cmd+V to paste</span>
                    </div>
                </div>
            )
        },
        {
            emoji: <Icons.Search className="h-6 w-6 text-[#7C3AED]" />,
            title: "Get Instant Analysis",
            desc: "Our engine combines Semgrep static analysis with custom LLM evaluation models.",
            mock: (
                <div className="mt-6 bg-zinc-50 dark:bg-[#09090B] rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 shadow-inner">
                    <div className="space-y-3">
                        <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] w-2/3 animate-pulse"></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                            <span>Scanning...</span>
                            <span>67%</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            emoji: <Icons.Wrench className="h-6 w-6 text-[#7C3AED]" />,
            title: "Apply Secure Fixes",
            desc: "Review context-aware fix suggestions and apply them with a single click.",
            mock: (
                <div className="mt-6 bg-zinc-50 dark:bg-[#09090B] rounded-lg border border-[#34D399]/30 p-4 shadow-inner">
                    <div className="flex items-center space-x-2 mb-2">
                        <Icons.CheckCircle2 className="h-4 w-4 text-[#34D399]" />
                        <span className="text-xs font-mono font-medium text-emerald-700 dark:text-[#34D399]">READY TO PATCH</span>
                    </div>
                    <button className="w-full bg-[#18181B] dark:bg-[#1A1A1A] text-white text-xs py-2 rounded font-heading font-medium border border-zinc-700 dark:border-zinc-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
                        Apply Secure Code
                    </button>
                </div>
            )
        }
    ];

    return (
        <section className="py-24 bg-white dark:bg-[#09090B]" id="how-it-works">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#18181B] dark:text-[#FAFAF9]">Security in 3 simple steps</h2>
                    <p className="mt-4 text-lg font-body text-zinc-600 dark:text-zinc-400">No complex integrations or lengthy setups required.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 relative">
                    <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent z-0"></div>

                    {steps.map((step, index) => (
                        <Reveal key={index} delay={index * 200} className="bg-white dark:bg-[#18181B] rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm relative z-10 unique-card hover:border-[#7C3AED]/50 transition-colors duration-300">
                            <div className="w-12 h-12 bg-[#FAFAF9] dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center text-2xl mb-6 mx-auto md:mx-0 shadow-inner">
                                {step.emoji}
                            </div>

                            <h3 className="text-xl font-heading font-bold text-[#18181B] dark:text-[#FAFAF9] mb-3 text-center md:text-left">{step.title}</h3>
                            <p className="font-body text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed text-center md:text-left min-h-[60px]">
                                {step.desc}
                            </p>

                            {step.mock}
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
