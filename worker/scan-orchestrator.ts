import { Job } from 'bullmq';
import { ScanJob, Vulnerability, ParsedVulnerability } from '../types';
import { supabaseAdmin } from './supabase';
import fs from 'fs/promises';
import path from 'path';

import { runSemgrepAnalysis } from './analyzers/static-analyzer';
import { scanForSecrets } from './analyzers/secret-scanner';
import { runAIAnalysis, checkOllamaHealth, analyzeFileWithAI } from './analyzers/ai-analyzer';
import { calculateSecurityScore, getScoreLabel } from './reporters/score-calculator';
import { deduplicateVulnerabilities, assignVulnCodes } from './reporters/vulnerability-mapper';
import { getFilesToScan, detectLanguagesInDirectory } from './parsers/language-detector';
import { cloneRepository } from './lib/git';
import { downloadR2Files } from './lib/r2-utils';
import { deleteFolder } from './r2-client';

// Recursive file finder — locates a file by name anywhere in a directory
async function findFileByName(
  dir: string,
  targetName: string,
  maxDepth: number = 10
): Promise<string | null> {
  if (maxDepth < 0) return null

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    
    // Check current level first
    for (const entry of entries) {
      if (entry.isFile() && entry.name === targetName) {
        return path.join(dir, entry.name)
      }
    }
    
    // Then recurse into subdirectories
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const found = await findFileByName(
          path.join(dir, entry.name),
          targetName,
          maxDepth - 1
        )
        if (found) return found
      }
    }
  } catch {
    // Ignore permission errors etc
  }

  return null
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function orchestrateScan(job: Job<ScanJob>) {
  const { scanId, projectId, userId, files, sourceType } = job.data;
  
  console.log(`\n🔍 Starting scan ${scanId}`);
  const startTime = Date.now();
  const tempDir = path.join('/tmp', 'kavach-scans', scanId);

  try {
    // 3. Update scan status
    console.log(`🗄️  Updating status to downloading...`);
    await supabaseAdmin
      .from('scans')
      .update({
        status: 'downloading',
        progress_percentage: 5,
        progress_message: 'Preparing scan environment...',
        started_at: new Date().toISOString(),
      })
      .eq('id', scanId);

    // 4. Create temp directory
    await fs.mkdir(tempDir, { recursive: true });

    // 5. Handle different source types
    console.log(`📡 Processing source type: ${sourceType}`);
    if (sourceType === 'github') {
      if (!job.data.repoUrl) {
        throw new Error("GitHub repository URL is missing");
      }
      
      const cloneRes = await cloneRepository(job.data.repoUrl, tempDir, 100);
      
      if (!cloneRes.success) {
        throw new Error(cloneRes.error || "Failed to clone GitHub repository");
      }
      
      console.log(`✅ Cloned successfully: ${cloneRes.totalFiles} code files (${cloneRes.totalSize?.toFixed(2)} MB)`);
    } else if (sourceType === 'upload') {
      if (!job.data.r2Keys || job.data.r2Keys.length === 0) {
        throw new Error("No files were provided for the upload scan.");
      }
      
      const downloadRes = await downloadR2Files(job.data.r2Keys, tempDir);
      
      if (!downloadRes.success) {
        throw new Error(downloadRes.error || "Failed to download files from storage.");
      }
    } else if (sourceType === 'paste') {
      if (job.data.pastedCode) {
        let ext = 'js';
        if (job.data.language) {
          const lang = job.data.language.toLowerCase();
          const extMap: Record<string, string> = {
            javascript: 'js',
            js: 'js',
            typescript: 'ts',
            ts: 'ts',
            python: 'py',
            py: 'py',
            go: 'go',
            golang: 'go',
            java: 'java',
            php: 'php',
            csharp: 'cs',
            'c#': 'cs',
            ruby: 'rb',
            rust: 'rs',
            cpp: 'cpp',
            'c++': 'cpp',
            c: 'c',
          };
          ext = extMap[lang] ?? 'txt';  // Safe fallback: unknown → .txt
        }
        const filePath = path.join(tempDir, `code.${ext}`);
        await fs.writeFile(filePath, job.data.pastedCode);
        console.log(`📝 Wrote pasted code to code.${ext}`);
      }
    }

    // ═══════════════════════════════════════════
    // STEP A: Detect files and languages
    // ═══════════════════════════════════════════
    console.log(`📂 Scanning files in ${tempDir}...`);

    const filesForScan = await getFilesToScan(tempDir);
    const languages = await detectLanguagesInDirectory(tempDir);

    console.log(`📂 Found ${filesForScan.length} files across ${languages.length} languages`);
    console.log(`📊 Languages: ${languages.join(', ') || 'none detected'}`);

    // Update scan with file/language info
    const totalLines = filesForScan.reduce((sum, f) => sum + f.lineCount, 0);

    await supabaseAdmin.from('scans').update({
      files_scanned: filesForScan.length,
      lines_scanned: totalLines,
      languages_detected: languages,
    }).eq('id', scanId);

    // Edge case: no files to scan
    if (filesForScan.length === 0) {
      console.log('⚠️ No scannable files found. Marking as completed with perfect score.');
      
      await supabaseAdmin.from('scans').update({
        status: 'completed',
        progress_percentage: 100,
        progress_message: 'No files to scan',
        security_score: 100,
        grade: 'A+',
        total_vulnerabilities: 0,
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
        info_count: 0,
        scan_duration_seconds: Math.round((Date.now() - startTime) / 1000),
        completed_at: new Date().toISOString(),
      }).eq('id', scanId);
      
      // Clean up temp directory
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
      return;
    }

    // ═══════════════════════════════════════════
    // STEP B: Update status to scanning
    // ═══════════════════════════════════════════
    await supabaseAdmin.from('scans').update({
      status: 'scanning',
      progress_percentage: 20,
      progress_message: 'Running static analysis...',
    }).eq('id', scanId);

    // ═══════════════════════════════════════════
    // STEP C: Run Semgrep static analysis
    // ═══════════════════════════════════════════
    console.log('🔍 Running Semgrep static analysis...');
    const staticResults = await runSemgrepAnalysis(tempDir, languages);
    console.log(`🔍 Semgrep found ${staticResults.length} issues`);

    // ═══════════════════════════════════════════
    // STEP D: Run secret scanning
    // ═══════════════════════════════════════════
    await supabaseAdmin.from('scans').update({
      progress_percentage: 35,
      progress_message: 'Scanning for hardcoded secrets...',
    }).eq('id', scanId);

    console.log('🔑 Running secret scanning...');
    const secretResults = await scanForSecrets(tempDir, filesForScan);
    console.log(`🔑 Secret scanner found ${secretResults.length} issues`);

    // ═══════════════════════════════════════════
    // STEP E: Update status to analyzing (AI phase)
    // ═══════════════════════════════════════════
    await supabaseAdmin.from('scans').update({
      status: 'analyzing',
      progress_percentage: 50,
      progress_message: 'AI analyzing your code...',
    }).eq('id', scanId);

    // Check if Ollama is available
    console.log('🤖 Checking Ollama health...');
    const ollamaReady = await checkOllamaHealth();

    if (ollamaReady) {
      console.log('✅ Ollama is ready');
    } else {
      console.log('⚠️ Ollama not available - will use Gemini fallback if configured');
    }

    // ═══════════════════════════════════════════
    // STEP F: Run AI analysis with progress updates
    // ═══════════════════════════════════════════
    console.log(`🤖 Starting AI analysis of ${filesForScan.length} files...`);

    const aiResults: ParsedVulnerability[] = [];

    for (let i = 0; i < filesForScan.length; i++) {
      // ── CHECK FOR CANCELLATION ──────────────────────────────
      const { data: currentScan } = await supabaseAdmin
        .from('scans')
        .select('status')
        .eq('id', scanId)
        .single();
        
      if (currentScan?.status === 'cancelled') {
        throw new Error('SCAN_CANCELLED');
      }

      const file = filesForScan[i];
      
      try {
        console.log(`🤖 Analyzing ${file.name} (${file.lineCount} lines)...`);
        const results = await analyzeFileWithAI(file, scanId);
        aiResults.push(...results);
        console.log(`🤖 Found ${results.length} vulnerabilities in ${file.name}`);
      } catch (fileError) {
        console.error(`❌ AI analysis failed for ${file.name}:`, fileError);
        // Continue with next file - don't crash entire scan
      }
      
      // Update progress from 50% to 85% incrementally
      const progressPercent = 50 + Math.floor((35 * (i + 1)) / filesForScan.length);
      await supabaseAdmin.from('scans').update({
        progress_percentage: progressPercent,
        progress_message: `AI analyzed ${i + 1}/${filesForScan.length} files`,
      }).eq('id', scanId);
    }

    console.log(`🤖 AI analysis complete: ${aiResults.length} total vulnerabilities`);

    // ═══════════════════════════════════════════
    // STEP G: Update status to scoring
    // ═══════════════════════════════════════════
    await supabaseAdmin.from('scans').update({
      status: 'scoring',
      progress_percentage: 90,
      progress_message: 'Calculating security score...',
    }).eq('id', scanId);

    // ═══════════════════════════════════════════
    // STEP H: Combine all vulnerabilities
    // ═══════════════════════════════════════════
    const allVulnerabilities: ParsedVulnerability[] = [
      ...staticResults,
      ...secretResults,
      ...aiResults,
    ];

    console.log(`📊 Total vulnerabilities before deduplication: ${allVulnerabilities.length}`);

    // ═══════════════════════════════════════════
    // STEP I: Deduplicate vulnerabilities
    // ═══════════════════════════════════════════
    const dedupedVulns = deduplicateVulnerabilities(allVulnerabilities);
    console.log(`📊 After deduplication: ${dedupedVulns.length}`);

    // ═══════════════════════════════════════════
    // STEP J: Assign KAVACH-XXX codes
    // ═══════════════════════════════════════════
    const codedVulns = assignVulnCodes(dedupedVulns);

    // ═══════════════════════════════════════════
    // STEP K: Calculate security score
    // ═══════════════════════════════════════════
    const { score, grade } = calculateSecurityScore(dedupedVulns);
    const scoreLabel = getScoreLabel(score);
    console.log(`📊 Security score: ${score}/100 (${grade}) - ${scoreLabel}`);

    // ═══════════════════════════════════════════
    // STEP L: Save vulnerabilities to Supabase
    // ═══════════════════════════════════════════
    if (codedVulns.length > 0) {
      console.log(`💾 Saving ${codedVulns.length} vulnerabilities to database...`);
      
      const vulnsToInsert = codedVulns.map(v => ({
        scan_id: scanId,
        vuln_code: v.vuln_code,
        name: v.name,
        description: v.description,
        severity: v.severity,
        owasp_category: v.owasp_category,
        owasp_id: v.owasp_id,
        cwe_id: v.cwe_id,
        file_path: v.file_path,
        line_number: v.line_number,
        line_end: v.line_end,
        vulnerable_code: v.vulnerable_code,
        fixed_code: v.fixed_code,
        ai_explanation: v.ai_explanation,
        ai_fix_explanation: v.ai_fix_explanation,
        why_ai_makes_this_mistake: v.why_ai_makes_this_mistake,
        detection_method: v.detection_method,
        tool_name: v.tool_name,
      }));
      
      const { error: insertError } = await supabaseAdmin
        .from('vulnerabilities')
        .insert(vulnsToInsert);
      
      if (insertError) {
        console.error('❌ Failed to save vulnerabilities:', insertError);
        // Don't crash - continue to update scan status
      } else {
        console.log(`✅ Saved ${vulnsToInsert.length} vulnerabilities`);
      }
    }

    // ═══════════════════════════════════════════
    // STEP L2: Save file contents for Auto-Fix (Pro/Enterprise only)
    // ═══════════════════════════════════════════
    try {
      // Check user plan
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('plan')
        .eq('id', userId)
        .single()

      const isPro = userData?.plan === 'pro' || userData?.plan === 'enterprise'

      if (isPro && codedVulns.length > 0) {
        console.log('💾 Saving file contents for Auto-Fix (Pro user)...')

        // Get unique file paths that have vulnerabilities
        const vulnerableFilePaths = [...new Set(
          codedVulns
            .map(v => v.file_path)
            .filter((fp): fp is string => !!fp)
        )]

        console.log(`💾 Attempting to save ${vulnerableFilePaths.length} unique files`)

        const fileContentsToInsert = []

        for (const filePath of vulnerableFilePaths) {
          try {
            // ─── Smart path resolution ─────────────────────
            // Handle 3 cases:
            //   1. Absolute path already: "/tmp/kavach-scans/xxx/foo.js"
            //   2. Relative to tempDir:   "app/routes/index.js"
            //   3. Just a filename:       "index.js"
            
            let fullPath: string
            let relativePath: string

            if (filePath.startsWith(tempDir)) {
              // Case 1: absolute path within tempDir
              fullPath = filePath
              relativePath = path.relative(tempDir, filePath)
            } else if (filePath.startsWith('/tmp/kavach-scans/')) {
              // Case 1b: absolute path but from a different scan folder
              // (should not happen but handle gracefully)
              const parts = filePath.split('/')
              const scanFolderIdx = parts.indexOf('kavach-scans')
              if (scanFolderIdx !== -1 && parts.length > scanFolderIdx + 2) {
                relativePath = parts.slice(scanFolderIdx + 2).join('/')
                fullPath = path.join(tempDir, relativePath)
              } else {
                fullPath = filePath
                relativePath = path.basename(filePath)
              }
            } else {
              // Case 2 & 3: relative path or bare filename
              relativePath = filePath
              fullPath = path.join(tempDir, filePath)
            }

            // Defense-in-depth: don't read non-code files even if a scanner 
            // reports vulnerabilities in them (shouldn't happen after secret-
            // scanner filter, but this is a safety net)
            const NON_CODE_EXTS = new Set([
              '.md', '.mdx', '.txt', '.log', '.csv', '.tsv',
              '.json', '.yaml', '.yml', '.toml', '.xml',
              '.lock', '.pdf', '.doc', '.docx',
            ])

            const fileExt = filePath.substring(filePath.lastIndexOf('.')).toLowerCase()
            if (NON_CODE_EXTS.has(fileExt)) {
              console.warn(`[scan-orchestrator] Skipping non-code file: ${filePath}`)
              continue
            }

            // ─── Try to read the file ──────────────────────
            let content: string
            try {
              content = await fs.readFile(fullPath, 'utf-8')
            } catch (primaryReadError) {
              // Fallback: try to find the file by name anywhere in tempDir
              console.warn(`⚠️ File not at ${fullPath}, searching tempDir...`)
              
              const baseName = path.basename(filePath)
              const foundPath = await findFileByName(tempDir, baseName)
              
              if (!foundPath) {
                console.warn(`⚠️ Could not locate ${baseName} anywhere in ${tempDir}`)
                continue
              }
              
              console.log(`✅ Found ${baseName} at ${foundPath}`)
              content = await fs.readFile(foundPath, 'utf-8')
              fullPath = foundPath
              relativePath = path.relative(tempDir, foundPath)
            }

            const lineCount = content.split('\n').length

            // Detect language from extension
            const ext = path.extname(relativePath).slice(1).toLowerCase()
            const langMap: Record<string, string> = {
              ts: 'typescript', tsx: 'typescript',
              js: 'javascript', jsx: 'javascript',
              mjs: 'javascript', cjs: 'javascript',
              py: 'python', rb: 'ruby', go: 'go',
              rs: 'rust', java: 'java', php: 'php',
              cs: 'csharp', cpp: 'cpp', c: 'c',
              swift: 'swift', kt: 'kotlin',
              md: 'markdown', json: 'json',
              yml: 'yaml', yaml: 'yaml', sql: 'sql',
            }
            const language = langMap[ext] ?? 'text'

            // Store using the ORIGINAL filePath as the key
            // so lookups from vulnerabilities table match
            fileContentsToInsert.push({
              scan_id: scanId,
              user_id: userId,
              file_path: filePath,      // Original path from vuln record
              file_content: content,
              language,
              line_count: lineCount,
              r2_key: job.data.r2Keys?.find(
                (k: string) => k.includes(path.basename(filePath))
              ) ?? null,
              expires_at: new Date(
                Date.now() + 48 * 60 * 60 * 1000
              ).toISOString(),
            })

            console.log(`✅ Prepared file for save: ${relativePath} (${content.length} bytes)`)

          } catch (fileReadError: any) {
            console.warn(`⚠️ Skipping ${filePath}: ${fileReadError.message}`)
          }
        }

        if (fileContentsToInsert.length > 0) {
          const { error: fileInsertError } = await supabaseAdmin
            .from('scan_file_contents')
            .insert(fileContentsToInsert)

          if (fileInsertError) {
            console.error('❌ Failed to save file contents:', fileInsertError)
          } else {
            console.log(`✅ Saved ${fileContentsToInsert.length} file contents to database`)
          }
        } else {
          console.warn('⚠️ No file contents to save — all reads failed')
        }
      } else if (!isPro) {
        console.log('ℹ️ Free user — skipping file content storage for auto-fix')
      }
    } catch (fileStorageError: any) {
      console.warn('⚠️ File content storage failed (non-critical):', fileStorageError.message)
      // Never crash the scan because of this
    }

    // ═══════════════════════════════════════════
    // STEP M: Calculate severity counts
    // ═══════════════════════════════════════════
    const criticalCount = codedVulns.filter(v => v.severity === 'CRITICAL').length;
    const highCount = codedVulns.filter(v => v.severity === 'HIGH').length;
    const mediumCount = codedVulns.filter(v => v.severity === 'MEDIUM').length;
    const lowCount = codedVulns.filter(v => v.severity === 'LOW').length;
    const infoCount = codedVulns.filter(v => v.severity === 'INFO').length;

    console.log(`📊 Severity breakdown:`);
    console.log(`   🔴 Critical: ${criticalCount}`);
    console.log(`   🟠 High: ${highCount}`);
    console.log(`   🟡 Medium: ${mediumCount}`);
    console.log(`   🔵 Low: ${lowCount}`);
    console.log(`   ⚪ Info: ${infoCount}`);

    // ═══════════════════════════════════════════
    // STEP N: Update scan record with final results
    // ═══════════════════════════════════════════
    const duration = Math.round((Date.now() - startTime) / 1000);

    const { error: scanUpdateError } = await supabaseAdmin
      .from('scans')
      .update({
        status: 'completed',
        progress_percentage: 100,
        progress_message: `Scan complete! Found ${codedVulns.length} vulnerabilities`,
        security_score: score,
        grade: grade,
        total_vulnerabilities: codedVulns.length,
        critical_count: criticalCount,
        high_count: highCount,
        medium_count: mediumCount,
        low_count: lowCount,
        info_count: infoCount,
        scan_duration_seconds: duration,
        completed_at: new Date().toISOString(),
      })
      .eq('id', scanId);

    if (scanUpdateError) {
      console.error('❌ Failed to update scan record:', scanUpdateError);
    }

    // ═══════════════════════════════════════════
    // STEP O: Update project record (increment total_scans)
    // ═══════════════════════════════════════════
    try {
      // First fetch current project to get total_scans
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('total_scans')
        .eq('id', projectId)
        .single();
      
      const currentTotal = project?.total_scans || 0;
      
      await supabaseAdmin
        .from('projects')
        .update({
          total_scans: currentTotal + 1,
          last_scan_score: score,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);
      
      console.log(`✅ Project updated (total scans: ${currentTotal + 1})`);
    } catch (projectError) {
      console.error('⚠️ Failed to update project record:', projectError);
      // Non-critical - scan is still saved
    }

    // ═══════════════════════════════════════════
    // STEP P: Clean up temp directory
    // ═══════════════════════════════════════════
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log(`🧹 Cleaned up temp directory: ${tempDir}`);
    } catch (cleanupError) {
      console.warn(`⚠️ Failed to clean up temp directory:`, cleanupError);
      // Non-critical - just leaves files in /tmp
    }

    // ═══════════════════════════════════════════
    // STEP P2: Clean up R2 uploaded files
    // ═══════════════════════════════════════════
    if (job.data.r2Keys && job.data.r2Keys.length > 0) {
      try {
        const firstKey = job.data.r2Keys[0];
        const parts = firstKey.split('/');
        if (parts.length >= 3) {
          const folderPrefix = parts.slice(0, 3).join('/') + '/';
          await deleteFolder(folderPrefix);
          console.log(`🧹 Deleted R2 folder: ${folderPrefix}`);
        }
      } catch (r2CleanupError) {
        console.warn(`⚠️ R2 cleanup failed (non-critical):`, r2CleanupError);
      }
    }

    // ═══════════════════════════════════════════
    // STEP Q: Log completion
    // ═══════════════════════════════════════════
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log(`✅ Scan ${scanId} completed successfully`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📊 Score: ${score}/100 (${grade})`);
    console.log(`🔍 Vulnerabilities: ${codedVulns.length}`);
    console.log('═══════════════════════════════════════════');
    console.log('');

  } catch (error: any) {
    if (error.message === 'SCAN_CANCELLED') {
      console.warn(`⚠️ Scan ${scanId} was cancelled by the user.`);
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to clean up temp directory ${tempDir} after cancellation:`, cleanupError);
      }
      return;
    }

    console.error(`\n❌ Scan ${scanId} failed!`);
    console.error(error.stack || error);

    try {
      await supabaseAdmin
        .from('scans')
        .update({
          status: 'failed',
          security_score: null,
          total_vulnerabilities: 0,
          error_message: error.message || 'Unknown error occurred during scan',
        })
        .eq('id', scanId);
    } catch (dbError) {
      console.error('❌ Failed to update scan status to failed:', dbError);
    }

    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn(`⚠️ Failed to clean up temp directory ${tempDir} after failure:`, cleanupError);
    }

    throw error;
  }
}
