# 🛡️ KAVACH — Testing Checklist

Complete this checklist before deploying or launching.

---

## Pre-Flight Checks

- [ ] Worker running: `cd worker && ./start.sh` (or `npm run dev`)
- [ ] Ollama running: `curl http://localhost:11434/api/tags`
- [ ] Frontend running: `npm run dev`
- [ ] TypeScript clean: `npx tsc --noEmit` (0 errors)
- [ ] Build succeeds: `npm run build` (0 errors, 0 warnings)

---

## Landing Page (`/`)

- [ ] Homepage loads with purple hero
- [ ] "AI writes your code. We scan it for security holes." heading visible
- [ ] Dark/light mode toggle works (top right)
- [ ] "Try Free" button → redirects to /login
- [ ] "Get Early Access" button → redirects to /login
- [ ] "Watch demo" link → scrolls to demo section
- [ ] Auto-demo section animates through scan states
- [ ] Stats section shows (40%, $4.4M, 70%)
- [ ] How It Works shows 3 steps
- [ ] Features grid shows 6 vulnerability types
- [ ] FAQ section expands/collapses
- [ ] Beta signup form submits and redirects
- [ ] Footer visible with GitHub link
- [ ] Mobile responsive: hamburger menu works
- [ ] All scroll animations trigger

---

## Authentication

- [ ] Visit /login → page loads
- [ ] "Continue with GitHub" button visible
- [ ] Click → GitHub OAuth flow starts
- [ ] After GitHub authorization → redirects to /dashboard
- [ ] User profile shows in sidebar (avatar + name + email)
- [ ] "Sign out" button in sidebar → redirects to /login
- [ ] Try visiting /dashboard without auth → redirects to /login

---

## Dashboard Home (`/dashboard`)

- [ ] Welcome message shows user's first name with wave emoji
- [ ] Stat cards visible when scans exist:
  - [ ] Total Scans (indigo icon)
  - [ ] Average Score (color based on score)
  - [ ] Vulnerabilities Found (yellow icon)
  - [ ] Critical Issues (red if > 0, green if 0)
- [ ] New Scan CTA card visible with purple left border
- [ ] Recent scans table loads (last 5 scans)
- [ ] Scans remaining alert if <= 2 (amber warning)
- [ ] Empty state shows when no scans (Shield icon + CTA)
- [ ] Sidebar navigation highlights active page

---

## New Scan (`/scans/new`)

- [ ] Page title "New Security Scan" visible
- [ ] 3 tabs render correctly:
  - [ ] Upload Files (Upload icon)
  - [ ] GitHub Repository (Github icon)
  - [ ] Paste Code (Code icon)
- [ ] Project Name input works and has default value

### Upload Files Tab
- [ ] Drag-drop zone visible
- [ ] Click zone to browse files
- [ ] Multiple files accepted
- [ ] File type validation works
- [ ] Selected files display with size + language dot
- [ ] Remove (X) button removes individual files
- [ ] Upload success → "Files uploaded!" toast

### GitHub Repository Tab
- [ ] URL input accepts GitHub URLs
- [ ] "Validate Repository" button works
- [ ] Loading state during validation
- [ ] Success state shows repo metadata
- [ ] Invalid URL shows error message
- [ ] Only accepts public repos

### Paste Code Tab
- [ ] Language selector dropdown works
- [ ] Monaco editor loads (dark theme)
- [ ] Character + line count updates
- [ ] Minimum 10 characters enforced
- [ ] Syntax highlighting works for selected language

### Common
- [ ] "Start Security Scan" button disabled until valid input
- [ ] Button loading state: "Preparing your scan..."
- [ ] After click → redirects to /scans/{id}

---

## Scan Progress (`/scans/[id]` - in progress)

- [ ] Shield icon with pulse animation
- [ ] Status title changes based on scan state:
  - [ ] "Your scan is in queue" (queued)
  - [ ] "Downloading your code..." (downloading)
  - [ ] "Running security checks..." (scanning)
  - [ ] "AI is analyzing your code..." (analyzing)
  - [ ] "Generating your report..." (scoring)
- [ ] 5-step pipeline indicator:
  - [ ] Queue → Download → Scan → AI Review → Report
  - [ ] Steps: grey (pending), indigo pulse (active), green check (done)
- [ ] Progress bar updates with percentage
- [ ] Progress message updates dynamically
- [ ] Queue position shown when status = 'queued'
- [ ] Real-time updates via Supabase Realtime work
- [ ] Polling stops after scan completes (check Network tab)
- [ ] Auto-transitions to report when status = 'completed'

---

## Scan Report (`/scans/[id]` - completed)

- [ ] Project name and date shown at top
- [ ] Share button copies URL to clipboard
- [ ] Rescan button navigates to /scans/new

### Score Section
- [ ] Circular SVG score renders (0-100)
- [ ] Score color matches: green (80+), yellow (70+), red (<50)
- [ ] Grade shows: A+/A/B/C/D/F
- [ ] Label shows: Excellent/Good/Fair/Poor/Critical
- [ ] Score animates counting up on mount

### Severity Cards
- [ ] 4 cards visible: Critical, High, Medium, Low
- [ ] Counts accurate
- [ ] Color-coded backgrounds

### Metadata
- [ ] Files Scanned count
- [ ] Lines Scanned count
- [ ] Total Issues count

### Vulnerability List
- [ ] Filter tabs work: All / Critical / High / Medium / Low
- [ ] Search input filters by name and file path
- [ ] Vulnerability cards expand/collapse smoothly
- [ ] Collapsed view shows: severity badge, name, file:line, OWASP
- [ ] Expanded view shows:
  - [ ] Full description
  - [ ] File path with line number
  - [ ] Vulnerable code block (red)
  - [ ] Fixed code block (green)
  - [ ] "Why AI makes this mistake" box (amber)
  - [ ] AI explanation
  - [ ] "Copy Fix" button → copies to clipboard
- [ ] "Back to all scans" link works

---

## Failed Scan State

- [ ] Red X icon shown
- [ ] "Scan Failed" title
- [ ] error_message displayed
- [ ] "Try Again" button → /scans/new

---

## All Scans (`/scans`)

- [ ] Page title "All Scans" with count
- [ ] New Scan button visible
- [ ] Table shows all user's scans
- [ ] Columns: Project, Date, Score, Issues, Status, Actions
- [ ] Score colors correct
- [ ] Status badges color-coded
- [ ] Click row → navigates to scan report
- [ ] View button navigates to report
- [ ] Rescan button → /scans/new
- [ ] Empty state shows when no scans

---

## Projects (`/projects`)

- [ ] Projects grid loads (or empty state)
- [ ] Cards show:
  - [ ] Source type icon (github/upload/paste)
  - [ ] Project name
  - [ ] Primary language badge
  - [ ] Total scans count
  - [ ] Last scan score with color
  - [ ] "Scan Now" button
- [ ] Hover effects work

---

## Settings (`/settings`)

- [ ] Profile card shows:
  - [ ] Avatar (first letter of name)
  - [ ] Name and email
  - [ ] Email row
  - [ ] GitHub username (if connected)
  - [ ] Plan badge (Free)
- [ ] Usage card shows:
  - [ ] Scans used / limit
  - [ ] Progress bar
  - [ ] Reset date info
  - [ ] Warning when limit reached
- [ ] Account info card:
  - [ ] Member since date
  - [ ] User ID

---

## Error States

- [ ] Visit /random-page → shows custom 404 page
- [ ] 404 shows KAVACH branding + "Back to Dashboard" button
- [ ] Trigger error → shows /app/error.tsx global error page
- [ ] Error page shows "Try Again" button
- [ ] Error page shows "Go to Dashboard" link

---

## Toast Notifications

- [ ] File upload success → "Files uploaded!" toast
- [ ] File upload failure → red toast with error
- [ ] Scan created → "🛡️ Scan started!" toast
- [ ] Copy fix → "Fix copied to clipboard!" toast
- [ ] Share link → "Link copied!" toast

---

## SEO & Metadata

- [ ] Landing page title: "KAVACH — AI Code Security Analyzer"
- [ ] Dashboard tab title: "Dashboard | KAVACH"
- [ ] Scans tab title: "All Scans | KAVACH"
- [ ] Projects tab title: "Projects | KAVACH"
- [ ] Settings tab title: "Settings | KAVACH"
- [ ] Meta descriptions set on all pages

---

## Performance

- [ ] Landing page loads in < 3 seconds
- [ ] Dashboard loads in < 2 seconds
- [ ] Full scan completes in < 30 seconds
- [ ] No console errors in production mode
- [ ] Lighthouse score > 85 (Performance)
- [ ] Loading skeletons show during navigation

---

## Production Build

- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npm run build` → succeeds
- [ ] Zero ESLint errors
- [ ] Zero warnings
- [ ] All 17 pages generated
- [ ] Bundle size acceptable

---

## Ready for Deployment ✅

When all checks pass, KAVACH is ready to deploy to Vercel!
