'use client'

import { useState, useEffect, useRef } from 'react'
import * as Icons from './LandingIcons'
import SectionDivider from './SectionDivider'

type ScanState = 'idle' | 'scanning' | 'found' | 'fix_ready' | 'fixed'

export default function AutoDemoSection() {
    const [scanState, setScanState] = useState<ScanState>('idle');
    const [score, setScore] = useState<number>(100);
    const sectionRef = useRef<HTMLElement>(null);
    const scoreInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => {
        let isSubscribed = true;

        const animateScore = (start: number, end: number, duration: number) => {
            let current = start;
            const stepTime = Math.abs(Math.floor(duration / (end - start)));
            if (scoreInterval.current) clearInterval(scoreInterval.current);

            scoreInterval.current = setInterval(() => {
                if (!isSubscribed) {
                    if (scoreInterval.current) clearInterval(scoreInterval.current);
                    return;
                }
                current += (start < end ? 1 : -1);
                setScore(current);
                if (current === end) {
                    if (scoreInterval.current) clearInterval(scoreInterval.current);
                }
            }, stepTime);
        };

        const runCycle = () => {
            if (!isSubscribed) return;
            setScanState('idle');
            setScore(100);

            timeoutIds.current.push(setTimeout(() => {
                if (!isSubscribed) return;
                setScanState('scanning');
            }, 2000));

            timeoutIds.current.push(setTimeout(() => {
                if (!isSubscribed) return;
                setScanState('found');
                animateScore(100, 68, 2000);
            }, 5000));

            timeoutIds.current.push(setTimeout(() => {
                if (!isSubscribed) return;
                setScanState('fix_ready');
            }, 8000));

            timeoutIds.current.push(setTimeout(() => {
                if (!isSubscribed) return;
                setScanState('fixed');
                animateScore(68, 100, 1500);
            }, 9000));
        };

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                runCycle();
                const loop = setInterval(runCycle, 15000);
                timeoutIds.current.push(loop);
            } else {
                timeoutIds.current.forEach(clearTimeout);
                if (scoreInterval.current) clearInterval(scoreInterval.current);
            }
        }, { threshold: 0.3 });

        if (sectionRef.current) observer.observe(sectionRef.current);

        const currentTimeoutIds = timeoutIds.current;
        return () => {
            isSubscribed = false;
            observer.disconnect();
            currentTimeoutIds.forEach(clearTimeout);
            if (scoreInterval.current) clearInterval(scoreInterval.current);
        };
    }, []);

    const vulnerableCode = `import os
from flask import Flask, request
app = Flask(__name__)

@app.route('/read_file')
def read_file():
    filename = request.args.get('file')
    # 🚨 DANGER: Path Traversal
    file_path = os.path.join('/var/www/data', filename)
    
    with open(file_path, 'r') as f:
        return f.read()`;

    const secureCode = `import os
from flask import Flask, request, abort
app = Flask(__name__)

@app.route('/read_file')
def read_file():
    filename = request.args.get('file')
    # ✅ FIXED: Validate filename
    if not filename or '/' in filename or '..' in filename:
        abort(400)
        
    file_path = os.path.join('/var/www/data', filename)
    with open(file_path, 'r') as f:
        return f.read()`;

    return (
        <section ref={sectionRef} className="py-24 bg-white dark:bg-[#09090B]" id="demo">
            <SectionDivider />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-heading font-bold text-[#18181B] dark:text-[#FAFAF9] tracking-tight">Auto-Scanning in Action</h2>
                    <p className="mt-4 text-lg font-body text-zinc-600 dark:text-zinc-400">See how KAVACH catches and fixes issues automatically.</p>
                </div>

                <div className="flex flex-col gap-8 max-w-4xl mx-auto">
                    {/* Editor Top Side - FIX #12: KEEP .card-hover */}
                    <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl bg-[#18181B] flex flex-col h-[400px] card-hover">
                        <div className="bg-[#09090B] px-4 py-3 flex items-center border-b border-zinc-800">
                            <div className="flex space-x-2">
                                <div className="w-3 h-3 rounded-full bg-red-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"></div>
                            </div>
                            <div className="mx-auto flex items-center text-xs font-mono text-zinc-400">
                                <span className="text-zinc-600">~/projects/api/</span>app.py
                            </div>
                        </div>

                        <div className="relative font-mono text-sm overflow-hidden flex-1 flex">
                            <div className="w-10 bg-[#09090B]/50 border-r border-zinc-800/50 py-6 text-right pr-3 select-none text-zinc-600 text-xs">
                                {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-[21px]">{i + 1}</div>)}
                            </div>
                            <div className="relative p-6 flex-1 overflow-hidden">
                                <pre className="text-zinc-300 leading-[21px] transition-all duration-500">
                                    <code dangerouslySetInnerHTML={{
                                        __html: scanState === 'fixed'
                                            ? secureCode.replace(/if not filename.*/g, '<span class="text-[#34D399]">if not filename or \\\'/\\\' in filename or \\\'..\\\' in filename:\\n        abort(400)</span>').replace('# ✅ FIXED: Validate filename', '<span class="text-[#34D399]"># ✅ FIXED: Validate filename</span>')
                                            : vulnerableCode.replace('os.path.join(\'/var/www/data\', filename)', '<span class="wavy-underline text-[#F87171]">os.path.join(\'/var/www/data\', filename)</span>').replace('# 🚨 DANGER: Path Traversal', '<span class="text-[#F87171]"># 🚨 DANGER: Path Traversal</span>')
                                    }} />
                                </pre>

                                {scanState === 'scanning' && (
                                    <div className="absolute left-0 right-0 h-full top-0 bg-gradient-to-b from-transparent via-[#7C3AED]/20 to-transparent border-b-2 border-[#7C3AED] z-10 scan-infinite-animation" />
                                )}

                                {(scanState === 'found' || scanState === 'fix_ready') && (
                                    <div className="absolute top-[140px] left-2 right-4 h-12 bg-[#F87171]/10 border border-[#F87171]/50 rounded pointer-events-none fade-in-animation" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Report Bottom Side - FIX #12: KEEP .card-hover */}
                    <div className="flex flex-col space-y-6">
                        <div className="bg-white dark:bg-[#18181B] rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-lg relative overflow-hidden h-[400px] flex flex-col unique-card card-hover">
                            <div className="flex justify-between items-center mb-8 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                                <div>
                                    <h3 className="font-heading font-semibold text-zinc-800 dark:text-white text-lg">Analysis Report</h3>
                                    <p className="font-body text-sm text-zinc-500 dark:text-zinc-400">app.py</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-mono font-medium text-zinc-500 tracking-wider mb-1">HEALTH_SCORE</div>
                                    <div className={`text-4xl font-mono font-bold ${score === 100 ? 'text-[#34D399]' : score > 80 ? 'text-[#FBBF24]' : 'text-[#F87171]'} transition-colors duration-300`}>
                                        {score}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col justify-center">
                                {scanState === 'idle' && (
                                    <div className="text-center text-zinc-500 fade-in-animation">
                                        <Icons.Code2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p className="font-mono text-sm">Waiting for code changes...</p>
                                    </div>
                                )}

                                {scanState === 'scanning' && (
                                    <div className="text-center fade-in-animation">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#7C3AED] mx-auto mb-4"></div>
                                        <p className="font-mono text-sm font-medium text-zinc-600 dark:text-zinc-300">Analyzing AI-generated logic...</p>
                                    </div>
                                )}

                                {(scanState === 'found' || scanState === 'fix_ready') && (
                                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-5 slide-up-animation">
                                        <div className="flex items-start">
                                            <Icons.AlertTriangle className="h-6 w-6 text-[#F87171] mt-0.5 mr-3 flex-shrink-0" />
                                            <div>
                                                <h4 className="font-heading font-semibold text-red-900 dark:text-red-300 text-lg">Path Traversal Risk</h4>
                                                <p className="font-body text-sm text-red-700 dark:text-red-400 mt-2 mb-4 leading-relaxed">
                                                    Unsanitized user input <code className="font-mono">filename</code> allows attackers to read arbitrary files on the server.
                                                </p>
                                                {scanState === 'fix_ready' ? (
                                                    <button className="bg-[#F87171] text-white text-sm px-4 py-2 rounded-lg font-heading font-semibold shadow-sm w-full animate-pulse">
                                                        Applying AI Fix...
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="h-9 w-full bg-red-500/10 border border-red-500/30 text-red-400 font-heading text-sm opacity-70 animate-pulse rounded-lg"
                                                        style={{ animationDuration: '3s' }}
                                                    >
                                                        ⏳ Waiting to apply fix...
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {scanState === 'fixed' && (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900/30 rounded-xl p-5 flex items-start slide-up-animation">
                                        <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-full mr-4 flex-shrink-0 relative">
                                            <Icons.CheckCircle2 className="h-6 w-6 text-[#34D399]" />
                                            <div className="absolute inset-0 bg-[#34D399] rounded-full animate-ping opacity-20"></div>
                                        </div>
                                        <div>
                                            <h4 className="font-heading font-semibold text-emerald-900 dark:text-emerald-300 text-lg">Code is Secure</h4>
                                            <p className="font-body text-sm text-emerald-700 dark:text-emerald-400 mt-2">
                                                Input validation added. Malicious file paths will now be rejected with a 400 Bad Request.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
