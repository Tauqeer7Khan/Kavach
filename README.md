# 🛡️ KAVACH — AI Code Security Analyzer

[![Status: In Active Development](https://img.shields.io/badge/Status-In_Active_Development-blueviolet?style=for-the-badge)](https://github.com/Tauqeer7Khan/Kavach)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> **"AI wrote the code. KAVACH makes it secure."**

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
In active development — Building in public over 7 days.

The 7-Day Build Plan
✅ Day 1: Project foundation, database schema, TypeScript types
✅ Day 2: Backend libraries, GitHub OAuth Auth, Middleware, User Sessions
⏳ Day 3: Worker process + Scan pipeline backbone
⏳ Day 4: Security analysis engine (Semgrep, Gitleaks, Ollama)
⏳ Day 5: API routes + Dashboard UI + New Scan Flow
⏳ Day 6: Landing page + Scan Reports + Polish
⏳ Day 7: Final testing, deployment, and public launch

Day 2 Completed ✅
Set up Supabase, Redis, R2, and queue utility libraries
Implemented GitHub OAuth authentication with Supabase Auth
Built protected dashboard routes with Next.js middleware
Created user session management hook (useUser)
Users successfully upserted to Supabase database on login
```
---

## 📄 License

MIT

---

## 👤 Author

**Tauqeer Khan**
- GitHub: [@Tauqeer7Khan](https://github.com/Tauqeer7Khan)

---


*Built for **Vibe Coders**. Made Secure by **KAVACH**.*

<p align="right">
  <em>"SAB BATA DUN?" 😜</em>
</p>
