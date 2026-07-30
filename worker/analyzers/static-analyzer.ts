import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { ParsedVulnerability, VulnerabilitySeverity } from '../../types';

const execAsync = promisify(exec);

export async function runSemgrepAnalysis(scanDir: string, languages: string[]): Promise<ParsedVulnerability[]> {
  console.log('🔍 Running Semgrep static analysis...');
  
  try {
    // Check if semgrep is installed
    try {
      await execAsync('semgrep --version');
    } catch (e) {
      console.log('⏭️ Semgrep not installed, skipping static analysis. Install with: brew install semgrep');
      return [];
    }

    // Build Semgrep command
    let command = `semgrep scan --json --config=auto`;

    // Add language specific configs
    if (languages.includes('javascript') || languages.includes('typescript')) {
      command += ` --config=p/javascript --config=p/typescript --config=p/owasp-top-ten`;
    }
    if (languages.includes('python')) {
      command += ` --config=p/python --config=p/flask --config=p/django`;
    }
    if (languages.includes('php')) {
      command += ` --config=p/php`;
    }
    
    // Always include
    command += ` --config=p/secrets --config=p/security-audit`;
    
    // Add scan directory
    command += ` ${scanDir}`;

    let stdout = '';
    let stderr = '';

    try {
      const result = await execAsync(command, { 
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (e: any) {
      // Semgrep returns non-zero exit code if it finds vulnerabilities, so we need to handle that.
      if (e.stdout) {
        stdout = e.stdout;
      } else {
        console.error(`⚠️ Semgrep analysis failed: ${e.message}`);
        return [];
      }
    }

    let parsedOutput;
    try {
      parsedOutput = JSON.parse(stdout);
    } catch (parseError) {
      console.error('⚠️ Failed to parse Semgrep JSON output');
      console.error(stdout.substring(0, 500) + '...');
      return [];
    }

    if (!parsedOutput.results || parsedOutput.results.length === 0) {
      console.log('🔍 Semgrep found 0 potential issues');
      return [];
    }

    const results = parsedOutput.results;
    console.log(`🔍 Semgrep found ${results.length} potential issues`);

    const vulnerabilities: ParsedVulnerability[] = [];

    for (const result of results) {
      const severityMap: Record<string, VulnerabilitySeverity> = {
        'ERROR': 'CRITICAL',
        'WARNING': 'HIGH',
        'INFO': 'MEDIUM',
      };
      
      const semgrepSeverity = result.extra?.severity || 'INFO';
      const severity = severityMap[semgrepSeverity.toUpperCase()] || 'MEDIUM';

      const tags = result.extra?.metadata?.cwe || result.extra?.metadata?.owasp || [];
      const tagsString = (Array.isArray(tags) ? tags.join(' ') : String(tags)).toLowerCase();
      // Combine with rule tags/id
      const allTags = (tagsString + ' ' + (result.check_id || '').toLowerCase()).split(/[ \-_:]/);

      const owaspInfo = mapToOWASP(result.check_id, allTags);

      // Read vulnerable code
      let vulnerableCode = '';
      try {
        const fileContent = await fs.readFile(result.path, 'utf8');
        const lines = fileContent.split('\n');
        const startLine = Math.max(0, (result.start?.line || 1) - 1);
        const endLine = Math.min(lines.length, result.end?.line || startLine + 1);
        vulnerableCode = lines.slice(startLine, endLine).join('\n');
      } catch (readErr) {
        // Fallback to lines provided by semgrep extra.lines if available, or just empty
        vulnerableCode = result.extra?.lines || '';
      }

      vulnerabilities.push({
        name: result.check_id.split('.').pop() || result.check_id,
        description: result.extra?.message || 'Semgrep finding',
        severity,
        owasp_category: owaspInfo.owasp_category,
        owasp_id: owaspInfo.owasp_id,
        cwe_id: owaspInfo.cwe_id,
        file_path: result.path.replace(scanDir, '').replace(/^\//, ''), // relative path
        line_number: result.start?.line || 1,
        line_end: result.end?.line || result.start?.line || 1,
        vulnerable_code: vulnerableCode,
        fixed_code: '',
        ai_explanation: result.extra?.message || 'Semgrep finding',
        ai_fix_explanation: '',
        why_ai_makes_this_mistake: 'Static analysis tools like Semgrep find patterns based on rules without deep semantic understanding. This was found via pattern matching.',
        detection_method: 'static',
        tool_name: 'semgrep'
      });
    }

    return vulnerabilities;

  } catch (error: any) {
    console.error(`⚠️ Semgrep analysis failed: ${error.message}`);
    return [];
  }
}

function mapToOWASP(ruleId: string, tags: string[]): { owasp_category: string, owasp_id: string, cwe_id: string } {
  const tagStr = tags.join(' ').toLowerCase() + ' ' + ruleId.toLowerCase();
  
  if (tagStr.includes('injection') || tagStr.includes('sqli')) {
    return { owasp_category: 'Injection', owasp_id: 'A03:2021', cwe_id: 'CWE-89' };
  }
  if (tagStr.includes('xss')) {
    return { owasp_category: 'Injection', owasp_id: 'A03:2021', cwe_id: 'CWE-79' };
  }
  if (tagStr.includes('auth')) {
    return { owasp_category: 'Identification and Authentication Failures', owasp_id: 'A07:2021', cwe_id: 'CWE-287' };
  }
  if (tagStr.includes('crypto')) {
    return { owasp_category: 'Cryptographic Failures', owasp_id: 'A02:2021', cwe_id: 'CWE-327' };
  }
  if (tagStr.includes('access-control')) {
    return { owasp_category: 'Broken Access Control', owasp_id: 'A01:2021', cwe_id: 'CWE-284' };
  }
  if (tagStr.includes('sensitive-data')) {
    return { owasp_category: 'Cryptographic Failures', owasp_id: 'A02:2021', cwe_id: 'CWE-200' };
  }
  if (tagStr.includes('deserialization')) {
    return { owasp_category: 'Software and Data Integrity Failures', owasp_id: 'A08:2021', cwe_id: 'CWE-502' };
  }
  if (tagStr.includes('path-traversal')) {
    return { owasp_category: 'Broken Access Control', owasp_id: 'A01:2021', cwe_id: 'CWE-22' };
  }
  if (tagStr.includes('command-injection') || tagStr.includes('exec')) {
    return { owasp_category: 'Injection', owasp_id: 'A03:2021', cwe_id: 'CWE-78' };
  }
  if (tagStr.includes('hardcoded') || tagStr.includes('credential')) {
    return { owasp_category: 'Cryptographic Failures', owasp_id: 'A02:2021', cwe_id: 'CWE-798' };
  }
  
  // Default
  return { owasp_category: 'Security Misconfiguration', owasp_id: 'A05:2021', cwe_id: 'CWE-000' };
}
