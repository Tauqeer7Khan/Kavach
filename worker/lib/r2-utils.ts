import fs from 'fs/promises';
import path from 'path';
import { downloadFile } from '../r2-client';

const MAX_TOTAL_SIZE_MB = 15; // 15MB max (API limit is 10MB, this is buffer)

export interface DownloadResult {
  success: boolean;
  error?: string;
  downloadedCount?: number;
  totalSize?: number;
}

// Helper function to download single file with timeout
async function downloadSingleFile(
  key: string, 
  targetDir: string, 
  timeoutMs: number
): Promise<{ success: boolean; size: number; fileName?: string; error?: string }> {
  try {
    const fileName = key.split('/').pop();
    if (!fileName) {
      return { success: false, size: 0, error: `Invalid key: ${key}` };
    }
    
    console.log(`📥 Downloading: ${fileName}`);
    
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${fileName}`)), timeoutMs)
    );
    
    const downloadPromise = downloadFile(key);
    const fileBuffer = await Promise.race([downloadPromise, timeoutPromise]) as Buffer;
    
    const destPath = path.join(targetDir, fileName);
    await fs.writeFile(destPath, fileBuffer);
    
    return { 
      success: true, 
      size: fileBuffer.length, 
      fileName 
    };
  } catch (error: any) {
    return { 
      success: false, 
      size: 0, 
      error: `${key}: ${error.message}` 
    };
  }
}

// Main function with parallel downloads (concurrency = 5)
export async function downloadR2Files(
  r2Keys: string[],
  targetDir: string,
  timeoutMs: number = 60_000
): Promise<DownloadResult> {
  // 1. Validate input
  if (!r2Keys || r2Keys.length === 0) {
    return { success: false, error: 'No files provided to download.' };
  }
  
  console.log(`📥 Starting parallel download of ${r2Keys.length} files`);
  const startTime = Date.now();
  
  // 2. Parallel downloads with concurrency limit
  const CONCURRENCY = 5;
  const results: Array<{ success: boolean; size: number; fileName?: string; error?: string }> = [];
  
  for (let i = 0; i < r2Keys.length; i += CONCURRENCY) {
    const batch = r2Keys.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(key => downloadSingleFile(key, targetDir, timeoutMs))
    );
    results.push(...batchResults);
  }
  
  // 3. Check for failures
  const failures = results.filter(r => !r.success);
  const successes = results.filter(r => r.success);
  const totalSize = successes.reduce((sum, r) => sum + r.size, 0);
  
  if (failures.length > 0) {
    console.error(`❌ ${failures.length} files failed to download:`);
    failures.forEach(f => console.error(`   - ${f.error}`));
    
    let userFriendlyError = failures[0].error || 'Failed to download files';
    
    // Detect common errors
    if (userFriendlyError.includes('NoSuchKey') || userFriendlyError.includes('does not exist')) {
      userFriendlyError = 'One or more files no longer exist in storage. Please re-upload.';
    } else if (userFriendlyError.includes('AccessDenied')) {
      userFriendlyError = 'Storage access denied. Please contact support.';
    } else if (userFriendlyError.includes('Timeout')) {
      userFriendlyError = 'Download timeout. Files may be too large or network too slow.';
    } else if (userFriendlyError.includes('ENOSPC')) {
      userFriendlyError = 'Server storage full. Please try again later.';
    } else if (userFriendlyError.includes('ETIMEDOUT') || userFriendlyError.includes('ECONNRESET')) {
      userFriendlyError = 'Network error. Please check your connection and try again.';
    }
    
    return {
      success: false,
      error: userFriendlyError
    };
  }
  
  // 4. Safety size check
  const totalSizeMB = totalSize / (1024 * 1024);
  if (totalSizeMB > MAX_TOTAL_SIZE_MB) {
    console.error(`❌ Total download size ${totalSizeMB.toFixed(2)}MB exceeds ${MAX_TOTAL_SIZE_MB}MB limit`);
    return {
      success: false,
      error: `Total file size ${totalSizeMB.toFixed(2)}MB exceeds ${MAX_TOTAL_SIZE_MB}MB safety limit`
    };
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Downloaded ${successes.length} files (${totalSizeMB.toFixed(2)} MB) in ${duration}s`);
  
  return {
    success: true,
    downloadedCount: successes.length,
    totalSize
  };
}
