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
      console.log('   [Day 4] Would clone GitHub repository here');
    } else if (sourceType === 'upload') {
      console.log('   [Day 4] Would download files from R2 here');
    } else if (sourceType === 'paste') {
      console.log('   [Day 4] Would write pasted code to files here');
    }
    
    // Create a sample.js file with dummy content
    const sampleFilePath = path.join(tempDir, 'sample.js');
    await fs.writeFile(sampleFilePath, 'const secret = "SUPER_SECRET_TOKEN";\nfunction evaluate(code) { eval(code); }\n');

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
    console.error(`\n❌ Scan ${scanId} failed!`);
    console.error(error.stack || error);

    try {
      await supabaseAdmin
        .from('scans')
        .update({
          status: 'failed',
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
