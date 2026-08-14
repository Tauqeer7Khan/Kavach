import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import { isScannableFile } from './scannable-extensions';

export interface CloneResult {
  success: boolean;
  path?: string;
  error?: string;
  totalFiles?: number;
  totalSize?: number;
}

async function safeRemove(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath); // Check if exists first
    await fs.rm(dirPath, { recursive: true, force: true });
    console.log(`🧹 Cleaned up: ${dirPath}`);
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      console.warn(`⚠️ Cleanup warning for ${dirPath}:`, err.message);
    }
    // Silently ignore if directory doesn't exist
  }
}

export async function cloneRepository(
  githubUrl: string,
  targetDir: string,
  maxSizeMB: number = 100
): Promise<CloneResult> {
  try {
    console.log(`📥 Cloning: ${githubUrl}`);
    
    const git: SimpleGit = simpleGit();
    
    const CLONE_TIMEOUT_MS = 60_000; // 60 seconds
    
    const clonePromise = git.clone(githubUrl, targetDir, [
      '--depth', '1',        // Only latest commit
      '--single-branch',     // Only main branch
    ]);
    
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Clone timeout: took longer than 60 seconds')), CLONE_TIMEOUT_MS)
    );
    
    await Promise.race([clonePromise, timeoutPromise]);
    
    console.log(`✅ Clone complete`);
    
    // Check size
    const size = await getDirectorySize(targetDir);
    const sizeMB = size / (1024 * 1024);
    
    if (sizeMB > maxSizeMB) {
      await safeRemove(targetDir);
      return {
        success: false,
        error: `Repository too large: ${sizeMB.toFixed(1)}MB (max ${maxSizeMB}MB)`
      };
    }
    
    // Remove .git folder to save space
    await safeRemove(path.join(targetDir, '.git'));
    
    // Count files
    const totalFiles = await countCodeFiles(targetDir);
    
    return {
      success: true,
      path: targetDir,
      totalFiles,
      totalSize: sizeMB
    };
    
  } catch (error: any) {
    console.error(`❌ Clone failed:`, error.message);
    
    // Cleanup (idempotent)
    await safeRemove(targetDir);
    
    let userFriendlyError = error.message || 'Failed to clone repository';
    
    // Detect common errors and provide helpful messages
    if (error.message?.includes('Repository not found') || error.message?.includes('could not read Username')) {
      userFriendlyError = 'Repository not found. Please check the URL and ensure the repo is public.';
    } else if (error.message?.includes('Authentication failed') || error.message?.includes('fatal: could not read Password')) {
      userFriendlyError = 'Repository is private or requires authentication.';
    } else if (error.message?.includes('timeout')) {
      userFriendlyError = 'Clone timeout: Repository is too large or network is slow.';
    } else if (error.message?.includes('rate limit')) {
      userFriendlyError = 'GitHub rate limit reached. Please try again in a few minutes.';
    } else if (error.message?.includes('ENOSPC')) {
      userFriendlyError = 'Server disk space full. Please try again later.';
    }
    
    return {
      success: false,
      error: userFriendlyError
    };
  }
}

async function getDirectorySize(dir: string): Promise<number> {
  let size = 0;
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dir, file.name);
      if (file.isDirectory()) {
        size += await getDirectorySize(filePath);
      } else {
        const stat = await fs.stat(filePath);
        size += stat.size;
      }
    }
  } catch {}
  return size;
}

async function countCodeFiles(dir: string): Promise<number> {
  let count = 0;
  
  async function walk(currentDir: string) {
    try {
      const files = await fs.readdir(currentDir, { withFileTypes: true });
      for (const file of files) {
        if (file.name.startsWith('.')) continue; // Skip hidden
        if (['node_modules', 'dist', 'build', '.next', 'vendor'].includes(file.name)) continue;
        
        const filePath = path.join(currentDir, file.name);
        if (file.isDirectory()) {
          await walk(filePath);
        } else {
          // Skip minified and maps
          if (file.name.includes('.min.') || file.name.endsWith('.map')) continue;
          
          if (isScannableFile(file.name)) {
            count++;
          }
        }
      }
    } catch {}
  }
  
  await walk(dir);
  return count;
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const patterns = [
      /github\.com[\/:]([^\/]+)\/([^\/\.]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { owner: match[1], repo: match[2].replace('.git', '') };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}
