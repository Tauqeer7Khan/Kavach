# KAVACH Architecture

## Overview

KAVACH is a security analysis tool built specifically for AI-generated code.
It scans codebases created by AI tools like ChatGPT, GitHub Copilot, Cursor, 
Bolt.new, and v0.dev to detect security vulnerabilities that AI commonly 
introduces.

The system uses a queue-based architecture where scans are processed 
asynchronously on a local machine running Ollama (local LLM), keeping 
costs at zero during the initial launch phase.

## System Components

### Frontend (Vercel)
- **Framework:** Next.js 14 with App Router
- **Styling:** Tailwind CSS + shadcn/ui
- **Language:** TypeScript
- **Hosting:** Vercel Free Tier
- **Cost:** $0

### Database (Supabase)
- **Type:** PostgreSQL via Supabase
- **Tables:** users, projects, scans, vulnerabilities, scan_files, scan_queue
- **Security:** Row Level Security (RLS) enabled on all tables
- **Auth:** Supabase Auth with GitHub OAuth
- **Cost:** $0 (free tier)

### Queue System (Upstash Redis)
- **Library:** BullMQ for job management
- **Purpose:** Async scan processing
- **Cost:** $0 (free tier — 10,000 commands/day)

### File Storage (Cloudflare R2)
- **Purpose:** Temporarily stores uploaded code files
- **Lifecycle:** Files deleted after scan completes
- **Cost:** $0 (free tier — 10GB storage)

### Worker Process (Local MacBook Air M5)
- **Runtime:** Node.js 20+
- **Location:** Runs locally on developer machine
- **Concurrency:** Processes one scan at a time
- **Tools:** Semgrep, Gitleaks, Ollama
- **Cost:** $0 (uses existing hardware)

### AI Analysis Engine (Ollama — Local)
- **Model:** Qwen 2.5 Coder 14B (Q4 quantized, code-specialized)
- **Runtime:** Ollama running locally on MacBook
- **RAM Usage:** ~5-6 GB
- **Inference Speed:** ~15-25 tokens/second
- **Backup:** Google Gemini API (free tier) when Mac is offline
- **Cost:** $0

### Security Tools
- **Semgrep:** Static analysis for known vulnerability patterns
- **Gitleaks:** Detects hardcoded secrets and API keys
- **Custom Regex Scanner:** Fallback secret detection
- **npm audit / pip-audit:** Dependency vulnerability checking

## Scan Flow

```
User → Vercel (Frontend)
         ↓
    Upload files → Cloudflare R2
         ↓
    Create job → Upstash Redis Queue
         ↓
    MacBook Worker picks job
         ↓
    Download files → Run Semgrep → Run Gitleaks → Run Ollama
         ↓
    Score & aggregate results
         ↓
    Save to Supabase
         ↓
    User dashboard auto-refreshes with report
```

## Queue Architecture (Handling 10-15 Concurrent Users)

The MacBook cannot process multiple scans simultaneously because the LLM 
requires full GPU focus for each query. To solve this:

1. Users submit scans → jobs added to Redis queue
2. Users see "Position in queue" with estimated wait time
3. Worker processes ONE scan at a time
4. Average scan time: ~2 minutes
5. Daily capacity: ~700+ scans
6. Users can close their browser and return later to see results

## Cost Analysis

| Phase | Monthly Cost | Notes |
|-------|-------------|-------|
| MVP (Month 1-2) | $0.00 | Everything on free tiers |
| Growth (Month 3-4) | $0-50 | Funded by Pro subscribers |
| Scale (Month 5-6) | $100-400 | Cloud worker + OpenAI API |

## Why This Architecture?

**Zero Cost:** Perfect for bootstrapping without external funding.

**Scalable:** Queue-based design means we can add more workers later 
without changing the architecture.

**User-Friendly:** Users don't need to configure CI/CD or install anything. 
Just upload code and get results.

**Security-First:** All uploaded code is sandboxed, scanned, and deleted. 
Never executed.