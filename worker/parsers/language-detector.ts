import { SupportedLanguage, FileToScan } from '../../types';
import fs from 'fs/promises';
import path from 'path';

import { SCANNABLE_EXTENSIONS, isScannableFile } from '../lib/scannable-extensions';
export function detectLanguage(filename: string): SupportedLanguage {
  const ext = path.extname(filename).toLowerCase();
  
  if (['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) return 'javascript';
  if (['.ts', '.tsx'].includes(ext)) return 'typescript';
  if (['.py', '.pyw'].includes(ext)) return 'python';
  if (['.php', '.phtml'].includes(ext)) return 'php';
  if (['.java'].includes(ext)) return 'java';
  if (['.go'].includes(ext)) return 'go';
  if (['.rb', '.erb'].includes(ext)) return 'ruby';
  if (['.rs'].includes(ext)) return 'rust';
  if (['.c', '.h'].includes(ext)) return 'c';
  if (['.cpp', '.cc', '.cxx', '.hpp'].includes(ext)) return 'cpp';
  if (['.cs'].includes(ext)) return 'csharp';
  
  return 'unknown';
}

async function walkDirectory(dir: string, fileList: string[] = []): Promise<string[]> {
  const skipDirs = new Set([
    'node_modules', '.git', '.next', 'vendor', 'dist', 'build', 
    '__pycache__', 'coverage', '.vscode', '.idea', 'target', 'out'
  ]);
  
  let files;
  try {
    files = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    console.warn(`⚠️ Failed to read directory ${dir}:`, err);
    return fileList;
  }
  
  for (const file of files) {
    if (file.name.startsWith('.')) continue; // skip hidden files

    if (file.isDirectory()) {
      if (skipDirs.has(file.name)) continue;
      await walkDirectory(path.join(dir, file.name), fileList);
    } else {
      fileList.push(path.join(dir, file.name));
    }
  }
  return fileList;
}

export async function detectLanguagesInDirectory(dirPath: string): Promise<SupportedLanguage[]> {
  const files = await walkDirectory(dirPath);
  const languages = new Set<SupportedLanguage>();
  
  for (const file of files) {
    const lang = detectLanguage(file);
    if (lang !== 'unknown') {
      languages.add(lang);
    }
  }
  
  return Array.from(languages);
}

export async function getFilesToScan(dirPath: string): Promise<FileToScan[]> {
  const skipExtensions = new Set([
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.bmp',
    // Videos/Audio
    '.mp3', '.mp4', '.avi', '.mov', '.wav',
    // Fonts
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    // Archives
    '.zip', '.tar', '.gz', '.rar', '.7z',
    // Binaries
    '.exe', '.dll', '.so', '.dylib',
    // System
    '.DS_Store', 'Thumbs.db'
  ]);

  const skipExactNames = new Set([
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
    'Gemfile.lock', 'poetry.lock', 'composer.lock',
    '.DS_Store', 'Thumbs.db'
  ]);
  
  const allFiles = await walkDirectory(dirPath);
  const result: FileToScan[] = [];
  const languages = new Set<string>();

  for (const filePath of allFiles) {
    const basename = path.basename(filePath);

    if (!isScannableFile(filePath)) {
      continue // Skip files that aren't recognized code/config
    }
    if (skipExactNames.has(basename)) continue;
    if (basename.endsWith('.min.js') || basename.endsWith('.min.css')) continue;

    try {
      const stat = await fs.stat(filePath);
      if (stat.size > 1024 * 1024) continue; // Skip larger than 1MB

      const content = await fs.readFile(filePath, 'utf-8');
      
      // Basic check for binary content which can sometimes read as utf-8
      if (content.includes('\u0000')) continue;

      const language = detectLanguage(filePath);
      languages.add(language);
      
      result.push({
        path: path.relative(dirPath, filePath),
        name: basename,
        content: content,
        language: language,
        lineCount: content.split('\n').length,
        sizeBytes: stat.size
      });

      if (result.length >= 100) break; // Limit to 100 files
      
    } catch (err) {
      console.warn(`⚠️ Failed to process file ${filePath}:`, err);
    }
  }

  const detectedLangs = Array.from(languages).filter(l => l !== 'unknown');
  console.log(`📂 Found ${result.length} files to scan in ${dirPath}`);
  console.log(`📊 Languages detected: ${detectedLangs.length > 0 ? detectedLangs.join(', ') : 'None'}`);

  return result;
}
