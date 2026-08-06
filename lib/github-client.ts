// lib/github-client.ts
// KAVACH V2 — GitHub PR creation via Octokit (Phase 3)

import { Octokit } from '@octokit/rest'

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface GitHubFileForPR {
  path: string
  content: string
}

export interface CreatePROptions {
  accessToken:   string
  owner:         string
  repo:          string
  baseBranch:    string
  newBranch:     string
  files:         GitHubFileForPR[]
  commitMessage: string
  prTitle:       string
  prBody:        string
}

export interface CreatePRResult {
  success:    boolean
  prNumber?:  number
  prUrl?:     string
  branchName?: string
  error?:     string
  errorCode?: 'no_access' | 'branch_exists' | 'base_missing' | 'rate_limit' | 'auth_expired' | 'unknown'
}

// ─────────────────────────────────────────────────────────
// Parse GitHub URL
// ─────────────────────────────────────────────────────────

export function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const cleaned = url.replace(/\.git$/, '').trim()

  // https://github.com/owner/repo
  const httpsMatch = cleaned.match(/github\.com[\/:]([^\/]+)\/([^\/\s]+)/i)
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] }

  // owner/repo shorthand
  const shortMatch = cleaned.match(/^([^\/\s]+)\/([^\/\s]+)$/)
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] }

  return null
}

// ─────────────────────────────────────────────────────────
// Verify user can push
// ─────────────────────────────────────────────────────────

export async function verifyRepoAccess(
  accessToken: string,
  owner: string,
  repo: string
): Promise<{ hasAccess: boolean; canPush: boolean; defaultBranch?: string; error?: string }> {
  try {
    const octokit = new Octokit({ auth: accessToken })
    const { data } = await octokit.repos.get({ owner, repo })
    return {
      hasAccess:     true,
      canPush:       data.permissions?.push ?? false,
      defaultBranch: data.default_branch,
    }
  } catch (err: any) {
    if (err.status === 401) {
      return { hasAccess: false, canPush: false, error: 'GitHub token invalid or expired' }
    }
    if (err.status === 404) {
      return { hasAccess: false, canPush: false, error: 'Repository not found' }
    }
    if (err.status === 403) {
      return { hasAccess: false, canPush: false, error: 'Access denied to repository' }
    }
    return { hasAccess: false, canPush: false, error: err.message ?? 'Failed to access repository' }
  }
}

// ─────────────────────────────────────────────────────────
// Normalize file paths (strip absolute paths from Phase 2)
// ─────────────────────────────────────────────────────────

export function normalizePathForGitHub(filePath: string): string {
  let clean = filePath

  // Strip /tmp/kavach-scans/{scanId}/ prefix if present
  if (clean.startsWith('/tmp/kavach-scans/')) {
    const parts = clean.split('/')
    if (parts.length > 4) {
      clean = parts.slice(4).join('/')
    }
  }

  // Strip leading slashes
  clean = clean.replace(/^\/+/, '')

  return clean
}

// ─────────────────────────────────────────────────────────
// MAIN — Create PR with all fixes
// ─────────────────────────────────────────────────────────

export async function createSecurityFixPR(opts: CreatePROptions): Promise<CreatePRResult> {
  const octokit = new Octokit({ auth: opts.accessToken })

  try {
    // 1. Get base branch SHA
    let baseSha: string
    try {
      const { data } = await octokit.git.getRef({
        owner: opts.owner,
        repo:  opts.repo,
        ref:   `heads/${opts.baseBranch}`,
      })
      baseSha = data.object.sha
    } catch {
      return {
        success:   false,
        error:     `Base branch '${opts.baseBranch}' not found`,
        errorCode: 'base_missing',
      }
    }

    // 2. Ensure branch name is unique
    let finalBranch = opts.newBranch
    try {
      await octokit.git.getRef({
        owner: opts.owner,
        repo:  opts.repo,
        ref:   `heads/${finalBranch}`,
      })
      // Branch exists — add timestamp suffix
      finalBranch = `${opts.newBranch}-${Date.now()}`
    } catch {
      // Doesn't exist — good, we can use it
    }

    // 3. Create new branch
    await octokit.git.createRef({
      owner: opts.owner,
      repo:  opts.repo,
      ref:   `refs/heads/${finalBranch}`,
      sha:   baseSha,
    })

    // 4. Get base commit tree
    const { data: baseCommit } = await octokit.git.getCommit({
      owner:      opts.owner,
      repo:       opts.repo,
      commit_sha: baseSha,
    })

    // 5. Create blob for each file
    const blobs = await Promise.all(
      opts.files.map(async (file) => {
        const { data } = await octokit.git.createBlob({
          owner:    opts.owner,
          repo:     opts.repo,
          content:  Buffer.from(file.content, 'utf-8').toString('base64'),
          encoding: 'base64',
        })
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha:  data.sha,
        }
      })
    )

    // 6. Create new tree
    const { data: newTree } = await octokit.git.createTree({
      owner:     opts.owner,
      repo:      opts.repo,
      base_tree: baseCommit.tree.sha,
      tree:      blobs,
    })

    // 7. Create commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner:   opts.owner,
      repo:    opts.repo,
      message: opts.commitMessage,
      tree:    newTree.sha,
      parents: [baseSha],
    })

    // 8. Point new branch at commit
    await octokit.git.updateRef({
      owner: opts.owner,
      repo:  opts.repo,
      ref:   `heads/${finalBranch}`,
      sha:   newCommit.sha,
    })

    // 9. Open pull request
    const { data: pr } = await octokit.pulls.create({
      owner: opts.owner,
      repo:  opts.repo,
      title: opts.prTitle,
      body:  opts.prBody,
      head:  finalBranch,
      base:  opts.baseBranch,
    })

    // 10. Add labels (best-effort — don't fail if this errors)
    try {
      await octokit.issues.addLabels({
        owner:        opts.owner,
        repo:         opts.repo,
        issue_number: pr.number,
        labels:       ['security', 'kavach', 'automated'],
      })
    } catch {
      // Labels optional
    }

    return {
      success:    true,
      prNumber:   pr.number,
      prUrl:      pr.html_url,
      branchName: finalBranch,
    }

  } catch (err: any) {
    // Map common GitHub errors
    if (err.status === 401) {
      return { success: false, error: 'GitHub authentication expired — please sign in again', errorCode: 'auth_expired' }
    }
    if (err.status === 403) {
      if (err.message?.toLowerCase().includes('rate limit')) {
        return { success: false, error: 'GitHub rate limit exceeded — try again in a few minutes', errorCode: 'rate_limit' }
      }
      return { success: false, error: 'No push access to this repository', errorCode: 'no_access' }
    }
    if (err.status === 422) {
      return { success: false, error: err.message ?? 'Branch already exists', errorCode: 'branch_exists' }
    }
    return { success: false, error: err.message ?? 'Unknown error', errorCode: 'unknown' }
  }
}

// ─────────────────────────────────────────────────────────
// Build the PR description
// ─────────────────────────────────────────────────────────

export function buildPRDescription(input: {
  totalVulns:      number
  filesFixed:      number
  scanUrl?:        string
  severityCounts:  { critical: number; high: number; medium: number; low: number }
  fixedFilesList:  Array<{ path: string; vulnsFixed: number; linesChanged: number }>
}): string {
  const { totalVulns, filesFixed, scanUrl, severityCounts, fixedFilesList } = input
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const fileList = fixedFilesList
    .map(f => `- \`${f.path}\` — ${f.vulnsFixed} ${f.vulnsFixed === 1 ? 'vulnerability' : 'vulnerabilities'} fixed, ${f.linesChanged} lines changed`)
    .join('\n')

  return `# 🛡️ Security Fixes by KAVACH

## Summary

Automatically generated security fixes from [KAVACH AI Security Scanner](https://ai-kavach.vercel.app).

| Metric | Value |
|--------|-------|
| **Vulnerabilities Fixed** | ${totalVulns} |
| **Files Modified**        | ${filesFixed} |
| **Scan Date**             | ${dateStr}    |

## Severity Breakdown

| Severity  | Count |
|-----------|-------|
| 🔴 Critical | ${severityCounts.critical} |
| 🟠 High     | ${severityCounts.high}     |
| 🟡 Medium   | ${severityCounts.medium}   |
| 🔵 Low      | ${severityCounts.low}      |

## Files Modified

${fileList || '_No files modified._'}

## ⚠️ Before Merging

- All fixes are **surgical** — only vulnerable lines were touched
- Each fix has a \`// KAVACH-FIX:\` comment
- **Review every change carefully**
- **Run your test suite** to verify functionality
- No refactoring or unrelated code changes were made

## How These Fixes Were Generated

1. Your code was scanned by KAVACH's AI security engine
2. Qwen 2.5 Coder identified real, exploitable vulnerabilities
3. Fixes were applied with strict surgical precision using SEARCH/REPLACE
4. Every fix was validated before this PR was created

${scanUrl ? `\n## References\n\n- [View original scan](${scanUrl})\n- [KAVACH](https://ai-kavach.vercel.app)\n` : ''}

---

*🤖 Generated by [KAVACH AI Security Scanner](https://ai-kavach.vercel.app) — Please review carefully before merging.*
`
}
