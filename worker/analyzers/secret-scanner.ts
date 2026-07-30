import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { ParsedVulnerability, FileToScan } from '../../types';

const execAsync = promisify(exec);

export async function scanForSecrets(scanDir: string, files: FileToScan[]): Promise<ParsedVulnerability[]> {
  console.log('🔑 Running secret scanning...');
  
  let gitleaksResults: ParsedVulnerability[] = [];
  try {
    gitleaksResults = await runGitleaksScan(scanDir);
    console.log(`🔑 Gitleaks found ${gitleaksResults.length} secrets`);
  } catch (error) {
    console.warn(`⚠️ Gitleaks execution failed: ${error}, using regex fallback only`);
  }

  let regexResults: ParsedVulnerability[] = [];
  try {
    regexResults = await runRegexSecretScan(files);
    console.log(`🔑 Regex scanner found ${regexResults.length} potential secrets`);
  } catch (error) {
    console.warn(`⚠️ Regex scanning failed: ${error}`);
  }

  // Combine and deduplicate (same file + same line = duplicate)
  const allResults = [...gitleaksResults, ...regexResults];
  const uniqueResults: ParsedVulnerability[] = [];
  const seen = new Set<string>();

  for (const result of allResults) {
    const key = `${result.file_path}:${result.line_number}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(result);
    }
  }

  console.log(`🔑 Total unique secrets found: ${uniqueResults.length}`);
  return uniqueResults;
}

export async function runGitleaksScan(scanDir: string): Promise<ParsedVulnerability[]> {
  try {
    await execAsync('gitleaks version');
  } catch (e) {
    console.log('⚠️ Gitleaks not installed, using regex fallback only');
    return [];
  }

  const reportDir = '/tmp/kavach-scans';
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `gitleaks-${Date.now()}.json`);
  
  // --exit-code 0 ensures it doesn't throw if it finds leaks
  const command = `gitleaks detect --source=${scanDir} --report-format=json --report-path=${reportPath} --no-git --exit-code 0`;
  
  try {
    await execAsync(command, { timeout: 120000 });
  } catch (e: any) {
    console.error(`⚠️ Gitleaks analysis failed to run properly: ${e.message}`);
    // Might still have created the report, we can try to read it anyway, or just return empty
  }

  let parsedOutput: any[] = [];
  try {
    const fileContent = await fs.readFile(reportPath, 'utf8');
    parsedOutput = JSON.parse(fileContent) || [];
  } catch (parseError) {
    // Expected if no leaks found and file not created, or parsing failed
    try {
      await fs.unlink(reportPath);
    } catch (_) {}
    return [];
  }

  // Clean up temp report file
  try {
    await fs.unlink(reportPath);
  } catch (unlinkError) {
    console.warn(`⚠️ Failed to delete gitleaks report file: ${reportPath}`);
  }

  if (!Array.isArray(parsedOutput) || parsedOutput.length === 0) {
    return [];
  }

  const vulnerabilities: ParsedVulnerability[] = [];

  for (const finding of parsedOutput) {
    const secret = finding.Secret || finding.Match;
    let vulnerableCode = finding.Match || '';
    
    // Attempt to read the full line if possible to provide better context
    try {
      if (finding.File) {
        const fullPath = path.isAbsolute(finding.File) ? finding.File : path.join(scanDir, finding.File);
        const sourceCode = await fs.readFile(fullPath, 'utf8');
        const lines = sourceCode.split('\n');
        const lineIndex = Math.max(0, (finding.StartLine || 1) - 1);
        if (lines[lineIndex]) {
          vulnerableCode = lines[lineIndex];
        }
      }
    } catch (_) {}

    const redactedCode = redactSecret(vulnerableCode, secret, finding.RuleID || 'Secret');

    vulnerabilities.push({
      name: `Hardcoded ${finding.RuleID || 'Secret'}`,
      description: 'A hardcoded secret was found in the source code.',
      severity: 'CRITICAL',
      owasp_category: 'Cryptographic Failures',
      owasp_id: 'A02:2021',
      cwe_id: 'CWE-798',
      file_path: finding.File || '',
      line_number: finding.StartLine || 1,
      line_end: finding.EndLine || finding.StartLine || 1,
      vulnerable_code: redactedCode,
      fixed_code: `// Use environment variable instead\nconst secret = process.env.YOUR_ENV_VAR;`,
      ai_explanation: 'Hardcoded secrets can be extracted by anyone with access to the code repository, including through git history.',
      ai_fix_explanation: 'Move the secret to an environment variable stored in a .env file (which should be in .gitignore).',
      why_ai_makes_this_mistake: 'AI models often generate placeholder credentials from training data. Always use environment variables for sensitive data.',
      detection_method: 'secret',
      tool_name: 'gitleaks'
    });
  }

  return vulnerabilities;
}

export async function runRegexSecretScan(files: FileToScan[]): Promise<ParsedVulnerability[]> {
  const SECRET_PATTERNS = [
    { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/, severity: 'CRITICAL' },
    { name: 'AWS Secret Key', regex: /(?<![A-Za-z0-9\/+=])[A-Za-z0-9\/+=]{40}(?![A-Za-z0-9\/+=])/, severity: 'CRITICAL' },
    { name: 'GitHub Token', regex: /ghp_[a-zA-Z0-9]{36}/, severity: 'CRITICAL' },
    { name: 'GitHub OAuth Token', regex: /gho_[a-zA-Z0-9]{36}/, severity: 'CRITICAL' },
    { name: 'Stripe Live Key', regex: /sk_live_[a-zA-Z0-9]{24,}/, severity: 'CRITICAL' },
    { name: 'Stripe Publishable Key', regex: /pk_live_[a-zA-Z0-9]{24,}/, severity: 'HIGH' },
    { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{48}/, severity: 'CRITICAL' },
    { name: 'Google API Key', regex: /AIza[0-9A-Za-z\-_]{35}/, severity: 'CRITICAL' },
    { name: 'Slack Token', regex: /xox[baprs]-[0-9a-zA-Z\-]+/, severity: 'CRITICAL' },
    { name: 'Generic API Key', regex: /api[_-]?key[s]?\s*[:=]\s*['"][a-zA-Z0-9_\-]{20,}['"]/i, severity: 'HIGH' },
    { name: 'Password in Code', regex: /password\s*[:=]\s*['"][^'"]{8,}['"]/i, severity: 'HIGH' },
    { name: 'Private Key', regex: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/, severity: 'CRITICAL' },
    { name: 'JWT Secret', regex: /jwt[_-]?secret\s*[:=]\s*['"][^'"]{20,}['"]/i, severity: 'HIGH' },
    { name: 'Database Connection String', regex: /(postgres|mysql|mongodb):\/\/[^:]+:[^@]+@/, severity: 'CRITICAL' }
  ] as const;

  const vulnerabilities: ParsedVulnerability[] = [];

  for (const file of files) {
    if (!file.content) continue;
    
    const lines = file.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of SECRET_PATTERNS) {
        const match = line.match(pattern.regex);
        if (match) {
          const secretValue = match[0];
          const redactedCode = redactSecret(line, secretValue, pattern.name);
          
          vulnerabilities.push({
            name: pattern.name,
            description: `A hardcoded ${pattern.name} was found in the source code.`,
            severity: pattern.severity,
            owasp_category: 'Cryptographic Failures',
            owasp_id: 'A02:2021',
            cwe_id: 'CWE-798',
            file_path: file.path,
            line_number: i + 1,
            line_end: i + 1,
            vulnerable_code: redactedCode,
            fixed_code: `// Use environment variable instead\nconst secret = process.env.YOUR_ENV_VAR;`,
            ai_explanation: 'Hardcoded secrets can be extracted by anyone with access to the code repository, including through git history.',
            ai_fix_explanation: 'Move the secret to an environment variable stored in a .env file (which should be in .gitignore).',
            why_ai_makes_this_mistake: 'AI models often generate placeholder credentials from training data. Always use environment variables for sensitive data.',
            detection_method: 'secret',
            tool_name: 'regex-scanner'
          });
        }
      }
    }
  }

  return vulnerabilities;
}

function redactSecret(line: string, secret: string, secretType: string): string {
  if (!secret || !line.includes(secret)) {
    return line;
  }
  return line.replace(secret, `[REDACTED - ${secretType}]`);
}
