# 🛡️ KAVACH — AI Code Security Analyzer

[![Live Demo](https://img.shields.io/badge/Live_Demo-ai--kavach.vercel.app-7C3AED?style=for-the-badge)](https://ai-kavach.vercel.app)
[![Status: Launched](https://img.shields.io/badge/Status-Launched-success?style=for-the-badge)](https://ai-kavach.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **"AI wrote the code. KAVACH makes it secure."**

🔗 **Live Demo:** https://ai-kavach.vercel.app  
📂 **Source:** https://github.com/Tauqeer7Khan/Kavach

KAVACH is an open-source security analysis tool designed specifically for AI-generated code. It scans codebases built with ChatGPT, GitHub Copilot, Cursor, Bolt.new, v0.dev, and other AI coding tools to find security vulnerabilities that AI commonly introduces.

---

## 🎯 The Problem

AI-generated code contains **40% more security vulnerabilities** than human-written code ([Stanford Research, 2023](https://arxiv.org/abs/2211.03622)). Most developers using AI tools deploy code without any security review.

Common vulnerabilities found in AI-generated code:
- 🐛 SQL injection via string concatenation
- 🔑 Hardcoded API keys and secrets
- 🚫 Missing input validation
- 🔓 Insecure authentication
- 💉 XSS vulnerabilities
- 🕵️ Weak cryptography

---

## ✨ What KAVACH Does

- 🔍 **Static Analysis** — Semgrep-powered pattern detection
- 🔑 **Secret Detection** — Finds hardcoded API keys and credentials
- 🤖 **AI Deep Review** — Local LLM (Ollama) analyzes code for complex vulnerabilities
- 📊 **Security Scoring** — Clear 0-100 score with A-F grading
- 🔧 **Fix Suggestions** — Get the exact fixed code for each vulnerability
- 📈 **OWASP Mapping** — Categorizes issues by OWASP Top 10

---

## 🛠️ Tech Stack

| Component | Technology | Cost |
|-----------|-----------|------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui | Free (Vercel) |
| Database | Supabase (PostgreSQL) | Free tier |
| Queue | Upstash Redis + BullMQ | Free tier |
| Storage | Cloudflare R2 | Free tier (10GB) |
| AI Engine | Ollama (Llama 3.1 8B) — runs locally | $0 |
| Static Scan | Semgrep | Open source |
| Secret Scan | Gitleaks | Open source |
| Backup AI | Google Gemini API | Free tier |
| Auth | Supabase Auth (GitHub OAuth) | Free tier |

**Total monthly cost: $0.00** 🚀

---

## 🏗️ Architecture

User → Vercel (Frontend) → Upstash Redis Queue → MacBook Worker → Supabase (Results)
↓
Semgrep + Gitleaks + Ollama

See [docs/architecture.md](docs/architecture.md) for detailed system design.

---

## 🚀 Setup

### Prerequisites
- Node.js 20+
- Ollama installed locally
- Supabase account (free)
- Upstash account (free)
- Cloudflare account (free)

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/Tauqeer7Khan/Kavach.git
cd Kavach
```

**2. Install dependencies**

```bash
npm install
```

**3. Set up environment variables**

```bash
cp .env.example .env.local
```

Fill in your API keys and credentials in `.env.local`.

**4. Set up Supabase database**

- Create a project at [supabase.com](https://supabase.com)
- Run `database/schema.sql` in the SQL Editor
- Run `database/seed.sql` for test data

**5. Install Ollama and download model**

```bash
brew install ollama
ollama serve
ollama pull llama3.1:8b
```

**6. Run the frontend**

```bash
npm run dev
```

**7. Run the worker (separate terminal)**

```bash
cd worker
npm install
npx ts-node index.ts
```

---

## 📁 Project Structure

```
kavach/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Login, register pages
│   ├── (dashboard)/       # Protected dashboard
│   ├── (marketing)/       # Landing, pricing pages
│   └── api/               # API routes
├── components/            # React components
├── database/              # SQL schemas and seeds
├── docs/                  # Documentation
├── hooks/                 # Custom React hooks
├── lib/                   # Backend utilities
├── types/                 # TypeScript definitions
└── worker/                # Local scan worker process
```

---

## 🌐 Supported Languages

JavaScript, TypeScript, Python, PHP, Java, Go, Ruby, Rust, C, C++, C#

---

```
🚧 Current Status & Build Progress
✅ LAUNCHED — Built and deployed in 7 days. Live at https://ai-kavach.vercel.app

The 7-Day Build Plan
✅ Day 1: Project foundation, database schema, TypeScript types
✅ Day 2: Backend libraries, GitHub OAuth Auth, Middleware, User Sessions
✅ Day 3: Worker process + Full scan pipeline with real analyzers
✅ Day 4: API routes + File upload + GitHub integration
✅ Day 5: Dashboard UI + Landing page + Full scan flow
✅ Day 6: Polish + Error Handling + Deployment Prep
✅ Day 7: Deployed to Vercel — LIVE at https://ai-kavach.vercel.app 🚀


 Day 1 Completed ✅
- Initialized Next.js 14 with TypeScript, Tailwind CSS, App Router
- Created Supabase database schema (6 tables with RLS)
- Built complete TypeScript domain types (422 lines)
- Set up folder architecture for Kavach ecosystem
- Configured separate worker package for local scan processing

 Day 2 Completed ✅
- Set up Supabase, Redis, R2, and queue utility libraries
- Implemented GitHub OAuth authentication with Supabase Auth
- Built protected dashboard routes with Next.js middleware
- Created user session management hook (useUser)
- Users successfully upserted to Supabase database on login

 Day 3 Completed ✅
- Built worker foundation with BullMQ + Redis queue
- Integrated Semgrep for static analysis (OWASP Top 10 detection)
- Integrated Gitleaks for hardcoded secret detection
- Built regex-based secret scanner (10+ patterns as fallback)
- Integrated Ollama running Llama 3.1 8B locally for AI analysis
- Added Google Gemini API as automatic fallback
- Built security scoring system (0-100 with A-F grading)
- Built vulnerability deduplication with fuzzy matching
- Built language detector for 12 programming languages
- Wired complete scan pipeline end-to-end
- First successful end-to-end scan: 85/100 (Grade A) in 7 seconds

 Day 4 Completed ✅
- Built 5 production-ready API routes with full auth protection
- POST /api/scan - Creates security scan and queues jobs
- GET /api/scan/[id] - Real-time status polling for progress
- GET /api/scan/[id]/report - Returns complete vulnerability report
- POST /api/upload - File uploads to Cloudflare R2 with validation
- POST /api/github - GitHub repository validation with metadata
- All endpoints protected with Supabase Auth middleware
- Comprehensive error handling (400, 401, 403, 404, 429, 500)
- Zero TypeScript errors across all endpoints

 Day 5 Completed ✅
- Built complete landing page with 14 marketing components
- Purple theme design system (#7C3AED) with dark/light mode toggle
- Google Fonts integration (Space Grotesk, Inter, JetBrains Mono, Instrument Serif)
- Auto-playing security demo with animated code scanning
- Built 5 dashboard components: StatCard, SecurityScore (animated SVG),
  ScanProgress (5-step pipeline), VulnerabilityCard (expandable), ScanTable
- Built 6 dashboard pages: home, scans list, [id] report, new scan, projects, settings
- Implemented useScan hook with polling + Supabase Realtime subscriptions
- Wired New Scan page: file upload (R2), GitHub validation, code paste (Monaco Editor)
- Real-time scan progress updates via Supabase Realtime channels
- Expandable vulnerability cards with "Copy Fix" clipboard integration
- Animated 0-100 security score with A+ to F grading
- Full end-to-end flow: Upload → Queue → Scan → AI Analysis → Report
- Zero TypeScript errors across entire codebase (frontend + backend + worker)

## Day 6 Completed ✅

- Added global error boundary (app/error.tsx) with dev mode error details
- Added custom 404 page (app/not-found.tsx) with KAVACH branding
- Added loading skeleton states for all dashboard pages
- Added SEO metadata with title template: "%s | KAVACH"
- Fixed <img> warning by migrating to Next.js Image component
- Suppressed BullMQ optional dependency warnings in next.config.mjs
- Connected landing page CTAs to /login flow
- Beta signup redirects to /login after success
- Created .vercelignore to exclude worker + docs from deployment
- Created worker/start.sh startup script (auto-installs Ollama, Semgrep, Gitleaks + downloads Llama 3.1 model)
- Updated .env.example with all required variables (frontend + worker)
- Created comprehensive E2E testing checklist (docs/testing-checklist.md)
- Production build: zero errors, zero warnings, 17 static pages
- Ready for Vercel deployment

## Day 7 Completed ✅

- Deployed frontend to Vercel: https://ai-kavach.vercel.app
- Configured all production environment variables
- Updated Supabase Auth redirect URLs for production
- Updated GitHub OAuth App callback URLs
- Fixed Vercel manifest error (removed empty route group)
- Custom vercel.app subdomain: ai-kavach.vercel.app
- All 17 pages working in production
- GitHub OAuth login working end-to-end on production
- Full scan flow verified: paste code → queue → scan → report
- README updated with live demo URL and launched status
- **7-day public build complete! 🛡️🚀**
```

📊 Key Metrics

Metric	Value
Average scan time	7-15 seconds
Vulnerability detection layers	3 (Static + Secret + AI)
OWASP categories covered	Top 10 (2021)
Programming languages	12
Infrastructure cost	$0/month
---

## 📄 License

MIT

---

## 👤 Author

**Tauqeer Khan**
- [GitHub](https://github.com/Tauqeer7Khan)
- [Linkedin](https://www.linkedin.com/in/tauqeer7khan)

---


*Built for **Vibe Coders**. Made Secure by **KAVACH**.*

*"**SAB BATA DUN?**"😜*