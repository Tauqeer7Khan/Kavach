import path from 'path';

export const SCANNABLE_EXTENSIONS = new Set([
  // JavaScript / TypeScript
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  // Python
  '.py', '.pyw',
  // Java / Kotlin / Scala
  '.java', '.kt', '.kts', '.scala',
  // C-family
  '.c', '.h', '.cpp', '.hpp', '.cc', '.cxx', '.cs',
  // Go / Rust
  '.go', '.rs',
  // Ruby / PHP
  '.rb', '.php', '.phtml',
  // Swift / Objective-C
  '.swift', '.m', '.mm',
  // Shell
  '.sh', '.bash', '.zsh',
  // Config files that often contain secrets
  '.env', '.envrc',
  // Web
  '.vue', '.svelte', '.html', '.htm',
  // Database
  '.sql',
  // Legacy paste-code format (backwards compat)
  '.javascript', '.typescript', '.python',
]);

export function isScannableFile(filePath: string): boolean {
  const basename = path.basename(filePath).toLowerCase();
  if (SCANNABLE_EXTENSIONS.has(basename)) return true;
  
  const ext = path.extname(filePath).toLowerCase();
  return SCANNABLE_EXTENSIONS.has(ext);
}
