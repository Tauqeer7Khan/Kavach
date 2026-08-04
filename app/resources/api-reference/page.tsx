import { Metadata } from 'next'
import ClientMarketingNavbar from '@/components/marketing/ClientMarketingNavbar'
import FooterMarketing from '@/components/marketing/FooterMarketing'

export const metadata: Metadata = {
  title: 'API Reference',
  description: 'KAVACH API Documentation. Integrate automated code security scanning into your own tools.',
}

export default function ApiReferencePage() {
    return (
        <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#09090B] text-[#18181B] dark:text-[#FAFAF9] transition-colors duration-300 font-body selection:bg-[#7C3AED]/30 flex flex-col">
            <ClientMarketingNavbar />
            
            <main className="flex-1">
                <section className="max-w-6xl mx-auto px-6 pt-32 pb-16">
                    <h1 className="font-heading text-5xl md:text-6xl font-bold mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        KAVACH API Documentation
                    </h1>
                    <p className="text-lg text-zinc-600 dark:text-zinc-900 dark:text-white/60 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 fill-mode-both">
                        Integrate KAVACH&apos;s security scanning engine directly into your CI/CD pipelines, IDEs, or custom internal tools.
                    </p>
                </section>

                <section className="max-w-4xl mx-auto px-6 pb-24 space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
                    
                    {/* Authentication */}
                    <div className="space-y-4">
                        <h2 className="text-3xl font-heading font-bold text-zinc-900 dark:text-white">1. Authentication</h2>
                        <p className="text-zinc-600 dark:text-zinc-900 dark:text-white/70">All API requests require a Bearer token in the Authorization header. You can generate an API key from your KAVACH dashboard settings.</p>
                        <div className="bg-white dark:bg-[#111111] p-4 rounded-xl border border-zinc-200 dark:border-white/10 font-mono text-sm overflow-x-auto">
                            <span className="text-blue-400">Authorization:</span> Bearer kv_live_xxxxxxxxxxxxxxxxxxxx
                        </div>
                    </div>

                    {/* POST /api/scan */}
                    <div className="space-y-4 pt-8 border-t border-zinc-200 dark:border-white/10">
                        <div className="flex items-center space-x-4">
                            <span className="bg-emerald-500/20 text-emerald-400 font-mono text-sm font-bold px-3 py-1 rounded">POST</span>
                            <h2 className="text-2xl font-heading font-bold text-zinc-900 dark:text-white">/api/scan</h2>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-900 dark:text-white/70">Create a new scan for a repository or specific code snippet. This endpoint is asynchronous.</p>
                        
                        <h4 className="font-mono text-sm text-zinc-500 dark:text-zinc-900 dark:text-white/40 pt-2">Request Body (JSON)</h4>
                        <pre className="bg-white dark:bg-[#111111] p-4 rounded-xl border border-zinc-200 dark:border-white/10 font-mono text-sm text-zinc-900 dark:text-white/80 overflow-x-auto">
{`{
  "type": "repo",
  "url": "https://github.com/Tauqeer7Khan/Kavach",
  "branch": "main"
}`}
                        </pre>

                        <h4 className="font-mono text-sm text-zinc-500 dark:text-zinc-900 dark:text-white/40 pt-2">Response (202 Accepted)</h4>
                        <pre className="bg-white dark:bg-[#111111] p-4 rounded-xl border border-zinc-200 dark:border-white/10 font-mono text-sm text-zinc-900 dark:text-white/80 overflow-x-auto">
{`{
  "success": true,
  "scanId": "scan_4f89d2...",
  "statusUrl": "/api/scan/scan_4f89d2..."
}`}
                        </pre>
                    </div>

                    {/* GET /api/scan/[id] */}
                    <div className="space-y-4 pt-8 border-t border-zinc-200 dark:border-white/10">
                        <div className="flex items-center space-x-4">
                            <span className="bg-blue-500/20 text-blue-400 font-mono text-sm font-bold px-3 py-1 rounded">GET</span>
                            <h2 className="text-2xl font-heading font-bold text-zinc-900 dark:text-white">/api/scan/[id]</h2>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-900 dark:text-white/70">Poll this endpoint to check the status of a pending scan.</p>
                        
                        <h4 className="font-mono text-sm text-zinc-500 dark:text-zinc-900 dark:text-white/40 pt-2">Example cURL</h4>
                        <div className="bg-white dark:bg-[#111111] p-4 rounded-xl border border-zinc-200 dark:border-white/10 font-mono text-sm text-zinc-900 dark:text-white/80 overflow-x-auto">
                            curl -X GET https://ai-kavach.vercel.app/api/scan/scan_123 \<br/>
                            &nbsp;&nbsp;-H &quot;Authorization: Bearer kv_live_...&quot;
                        </div>

                        <h4 className="font-mono text-sm text-zinc-500 dark:text-zinc-900 dark:text-white/40 pt-2">Response (200 OK)</h4>
                        <pre className="bg-white dark:bg-[#111111] p-4 rounded-xl border border-zinc-200 dark:border-white/10 font-mono text-sm text-zinc-900 dark:text-white/80 overflow-x-auto">
{`{
  "id": "scan_123",
  "status": "in_progress",
  "progress": 45,
  "currentStep": "Running Semgrep rules..."
}`}
                        </pre>
                    </div>

                    {/* GET /api/scan/[id]/report */}
                    <div className="space-y-4 pt-8 border-t border-zinc-200 dark:border-white/10">
                        <div className="flex items-center space-x-4">
                            <span className="bg-blue-500/20 text-blue-400 font-mono text-sm font-bold px-3 py-1 rounded">GET</span>
                            <h2 className="text-2xl font-heading font-bold text-zinc-900 dark:text-white">/api/scan/[id]/report</h2>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-900 dark:text-white/70">Retrieve the full security report once a scan status is `completed`.</p>
                        
                        <h4 className="font-mono text-sm text-zinc-500 dark:text-zinc-900 dark:text-white/40 pt-2">Response (200 OK)</h4>
                        <pre className="bg-white dark:bg-[#111111] p-4 rounded-xl border border-zinc-200 dark:border-white/10 font-mono text-sm text-emerald-400 overflow-x-auto">
{`{
  "score": 85,
  "grade": "B",
  "vulnerabilities": [
    {
      "id": "vuln_1",
      "severity": "HIGH",
      "title": "SQL Injection",
      "file": "db/query.js",
      "line": 42
    }
  ]
}`}
                        </pre>
                    </div>

                    {/* Error Codes */}
                    <div className="space-y-4 pt-8 border-t border-zinc-200 dark:border-white/10">
                        <h2 className="text-2xl font-heading font-bold text-zinc-900 dark:text-white">Error Codes</h2>
                        <ul className="space-y-2 font-mono text-sm">
                            <li><span className="text-red-400 w-16 inline-block">400</span> Bad Request (Missing required fields)</li>
                            <li><span className="text-red-400 w-16 inline-block">401</span> Unauthorized (Invalid or missing API key)</li>
                            <li><span className="text-red-400 w-16 inline-block">403</span> Forbidden (Insufficient permissions)</li>
                            <li><span className="text-red-400 w-16 inline-block">404</span> Not Found (Scan ID does not exist)</li>
                            <li><span className="text-red-400 w-16 inline-block">429</span> Too Many Requests (Rate limit exceeded)</li>
                            <li><span className="text-red-400 w-16 inline-block">500</span> Internal Server Error</li>
                        </ul>
                    </div>

                </section>
            </main>

            <FooterMarketing />
        </div>
    )
}
