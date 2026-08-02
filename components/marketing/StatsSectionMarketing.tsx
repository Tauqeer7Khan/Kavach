import Reveal from './Reveal'

export default function StatsSectionMarketing() {
    return (
        <section className="py-24 bg-[#09090B] text-white relative grid-pattern border-y border-zinc-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight">Why AI code needs scanning</h2>
                    <p className="mt-4 text-lg font-body text-zinc-400 max-w-2xl mx-auto">LLMs optimize for functionality, not security. Don&apos;t let generated code become a liability.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-zinc-800/50">
                    <Reveal delay={0} className="py-8 md:py-0 md:px-8">
                        <div className="text-7xl md:text-8xl font-accent italic text-[#7C3AED] mb-4 text-glow mx-auto max-w-fit">
                            40%
                            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent mt-2 opacity-50"></div>
                        </div>
                        <p className="text-zinc-200 font-heading font-semibold mb-2 text-xl">More vulnerabilities</p>
                        <p className="text-sm font-body text-zinc-400 leading-relaxed">in AI-generated code compared to human-written code (Stanford Research)</p>
                    </Reveal>

                    <Reveal delay={150} className="py-8 md:py-0 md:px-8">
                        <div className="text-7xl md:text-8xl font-accent italic text-[#7C3AED] mb-4 text-glow mx-auto max-w-fit">
                            $4.4<span className="text-5xl text-purple-400">M</span>
                            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent mt-2 opacity-50"></div>
                        </div>
                        <p className="text-zinc-200 font-heading font-semibold mb-2 text-xl">Average cost</p>
                        <p className="text-sm font-body text-zinc-400 leading-relaxed">of a data breach caused by insecure application code (IBM 2023)</p>
                    </Reveal>

                    <Reveal delay={300} className="py-8 md:py-0 md:px-8">
                        <div className="text-7xl md:text-8xl font-accent italic text-[#7C3AED] mb-4 text-glow mx-auto max-w-fit">
                            70%
                            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#7C3AED] to-transparent mt-2 opacity-50"></div>
                        </div>
                        <p className="text-zinc-200 font-heading font-semibold mb-2 text-xl">AI Apps</p>
                        <p className="text-sm font-body text-zinc-400 leading-relaxed">contain at least one critical OWASP Top 10 vulnerability on day one.</p>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
