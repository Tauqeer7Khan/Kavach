# KAVACH Roadmap

## Phase 1 — MVP (Week 1-2)

### Foundation
- [x] Project setup (Next.js 14 + TypeScript + Tailwind)
- [x] Database schema (Supabase with 6 tables)
- [x] TypeScript domain types
- [x] Environment configuration
- [ ] Backend library files (Supabase, Redis, R2, Queue)

### Authentication
- [ ] GitHub OAuth via Supabase Auth
- [ ] Protected dashboard routes
- [ ] User session management

### Worker Process
- [ ] Local worker foundation
- [ ] Redis queue integration
- [ ] Scan orchestration pipeline
- [ ] Temp file handling

### Security Analysis Engine
- [ ] Semgrep static analysis integration
- [ ] Gitleaks secret scanning
- [ ] Ollama AI-powered analysis
- [ ] Google Gemini backup
- [ ] Score calculation
- [ ] Vulnerability deduplication

### API Routes
- [ ] Create scan endpoint
- [ ] Scan status polling
- [ ] Scan report endpoint
- [ ] File upload endpoint
- [ ] GitHub repo validation

### Frontend UI
- [ ] Dashboard layout with sidebar
- [ ] New scan page (upload, GitHub, paste)
- [ ] Scan progress page with real-time updates
- [ ] Full vulnerability report page
- [ ] Landing page
- [ ] Pricing page

### Launch
- [ ] Landing page copy
- [ ] Product Hunt submission
- [ ] Twitter/X launch thread
- [ ] Reddit posts
- [ ] LinkedIn post

## Phase 2 — Growth (Month 2-3)

- [ ] Stripe payment integration
- [ ] Pro tier with OpenAI GPT-4o analysis
- [ ] PDF report export
- [ ] GitHub Actions integration
- [ ] VS Code extension (basic)
- [ ] Team accounts
- [ ] More language support (Rust, Go, PHP, Ruby)
- [ ] Framework-specific rules

## Phase 3 — Scale (Month 4-6)

- [ ] Cloud worker deployment
- [ ] Enterprise dashboard
- [ ] Compliance reports (SOC 2, GDPR, HIPAA)
- [ ] Custom rule creation UI
- [ ] Browser extension for Bolt.new/v0.dev/Replit
- [ ] Slack/Discord bot
- [ ] Public API for integrations
- [ ] White-label option

## Long-term Vision

KAVACH aims to become the default security layer for AI-generated code, 
serving millions of vibe coders, indie hackers, and non-security-focused 
developers who deploy AI-written code every day.