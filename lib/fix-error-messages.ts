// lib/fix-error-messages.ts
// KAVACH V2 — Translate technical fix errors into user-friendly messages

export interface FriendlyFixError {
  title: string       // Short heading
  message: string     // Detailed explanation
  suggestion: string  // What the user should do
  category: 'timeout' | 'complexity' | 'match-fail' | 'ai-skip' | 'unknown'
}

export function translateFixError(rawReason: string | undefined): FriendlyFixError {
  const reason = (rawReason ?? '').toLowerCase()

  // Timeout errors
  if (reason.includes('timeout') || reason.includes('timed out')) {
    return {
      title: 'File too complex for automatic fix',
      message: 'This file has many vulnerabilities or complex logic that took too long to process.',
      suggestion: 'Use "Get AI Fix Prompt" and paste it into Cursor or ChatGPT for manual fixing.',
      category: 'timeout',
    }
  }

  // AI applied a fix but our validator rejected it
  if (
    reason.includes('could not be applied') ||
    reason.includes('search text not found') ||
    reason.includes('block ') ||
    reason.includes('output could not be applied')
  ) {
    return {
      title: 'Could not safely apply the fix',
      message: 'The AI suggested a fix, but the change did not match your file exactly. We skipped it to protect your code.',
      suggestion: 'Use "Get AI Fix Prompt" to fix this file in your IDE with full context.',
      category: 'match-fail',
    }
  }

  // AI refused to fix
  if (
    reason.includes('no vulnerabilities found') ||
    reason.includes('cannot find') ||
    reason.includes('not exploitable') ||
    reason.startsWith('first:') // format from retry mechanism
  ) {
    return {
      title: 'AI needs your judgment',
      message: 'The AI was not confident enough to apply an automatic fix for this specific pattern.',
      suggestion: 'Use "Get AI Fix Prompt" — Cursor and ChatGPT have more context and can fix this reliably.',
      category: 'ai-skip',
    }
  }

  // File not found or content missing
  if (
    reason.includes('file content not found') ||
    reason.includes('no stored content') ||
    reason.includes('expired')
  ) {
    return {
      title: 'File content unavailable',
      message: 'The scanned file content is no longer available for auto-fix (48 hour retention window).',
      suggestion: 'Rescan the code to enable auto-fix again.',
      category: 'complexity',
    }
  }

  // Complexity / refactor needed
  if (
    reason.includes('refactor') ||
    reason.includes('wider changes') ||
    reason.includes('complex')
  ) {
    return {
      title: 'Fix requires broader changes',
      message: 'This vulnerability needs changes that would affect other parts of your code.',
      suggestion: 'Use "Get AI Fix Prompt" for a manual fix — safer for structural changes.',
      category: 'complexity',
    }
  }

  // Empty content
  if (reason.includes('empty')) {
    return {
      title: 'AI returned empty response',
      message: 'The AI did not generate a fix for this file.',
      suggestion: 'Try running Auto-Fix again, or use "Get AI Fix Prompt" for a manual fix.',
      category: 'unknown',
    }
  }

  // Unknown / catch-all
  return {
    title: 'Could not auto-fix this file',
    message: rawReason ?? 'The AI was unable to fix this file automatically.',
    suggestion: 'Use "Get AI Fix Prompt" to fix it manually in your IDE.',
    category: 'unknown',
  }
}
