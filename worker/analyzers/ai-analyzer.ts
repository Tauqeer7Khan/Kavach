import { Ollama } from 'ollama';
import { ParsedVulnerability, FileToScan, VulnerabilitySeverity } from '../../types';

const ollama = new Ollama({ 
  host: process.env.OLLAMA_HOST || 'http://localhost:11434' 
});

const MODEL_NAME = process.env.OLLAMA_MODEL || 'qwen2.5-coder:14b';
const AI_TIMEOUT_MS = 120000; // 2 minutes per file

export async function checkOllamaHealth(): Promise<boolean> {
  console.log('🤖 Checking Ollama health...');
  try {
    const list = await ollama.list();
    const hasModel = list.models.some(m => m.name === MODEL_NAME);
    if (hasModel) {
      console.log(`✅ Ollama ready with model: ${MODEL_NAME}`);
      return true;
    } else {
      console.log(`⚠️ Model not found. Run: ollama pull ${MODEL_NAME}`);
      return false;
    }
  } catch (error) {
    console.log('⚠️ Ollama not running. Start with: ollama serve');
    return false;
  }
}

function chunkCode(code: string, maxLines: number, overlap: number): string[] {
  const lines = code.split('\n');
  if (lines.length <= maxLines) return [code];

  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += (maxLines - overlap)) {
    chunks.push(lines.slice(i, i + maxLines).join('\n'));
  }
  return chunks;
}

function extractJSON(text: string): string {
  let cleaned = text.trim();
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = cleaned.match(jsonBlockRegex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return cleaned;
}

const SYSTEM_PROMPT = `You are a security code analyzer. Your ONLY job is to find REAL, EXPLOITABLE security vulnerabilities in source code.

════════════════════════════════════════
ABSOLUTE RULES — NEVER VIOLATE THESE
════════════════════════════════════════

1. {"vulnerabilities": []} is a CORRECT and EXPECTED response for clean code.
   Do not produce findings just because the schema shows an example.

2. Every single finding MUST be proven by SPECIFIC TOKENS visible in the
   code you are given. If you cannot point to the exact line and function
   call that is dangerous, do NOT report it.

3. If you are less than 90% confident a vulnerability is real and
   exploitable, OMIT IT entirely.

4. Do NOT flag: code style, missing docs, performance, variable naming,
   logging, arithmetic, string formatting unrelated to dangerous sinks.

════════════════════════════════════════
VULNERABILITY TYPES AND REQUIRED EVIDENCE
════════════════════════════════════════

INJECTION GROUP
• Code Injection
  REQUIRED EVIDENCE: eval(), new Function(), or dynamic require()
  AND the argument contains an external/user-controlled variable.

• Command Injection
  REQUIRED EVIDENCE: exec(), spawn(), system(), popen(), or child_process call
  AND the argument is built from external input (not a hardcoded string).

• SQL Injection
  REQUIRED EVIDENCE: A database call (query/execute/run/prepare)
  AND the query string uses concatenation (+) or template literals with
  an external variable. String concatenation ALONE (no db call) is NOT this.

• XSS (Cross-Site Scripting)
  REQUIRED EVIDENCE: innerHTML, outerHTML, document.write(), or
  dangerouslySetInnerHTML AND the value comes from external input.

PATH / FILE GROUP
• Path Traversal
  REQUIRED EVIDENCE: readFile/writeFile/open/unlink/readdir or similar fs call
  AND the path argument is built from user-controlled input without
  path.resolve() + restriction or sanitization.

SECRETS GROUP
• Hardcoded Secret / Credential
  REQUIRED EVIDENCE: A variable whose NAME suggests a credential
  (password, secret, key, token, api_key, auth, apikey)
  AND it is assigned a LITERAL STRING of 8+ characters that looks like a
  real value. Placeholders like "YOUR_KEY_HERE", "changeme", "example",
  "xxxx", or empty strings do NOT count.

CRYPTOGRAPHY GROUP
• Weak Cryptography
  REQUIRED EVIDENCE: A direct call to md5(), sha1(), or
  createHash('md5') / createHash('sha1') used for hashing passwords or
  security tokens (not file checksums or cache keys).

════════════════════════════════════════
WHAT IS NEVER A VULNERABILITY
════════════════════════════════════════

✗ String concatenation (+) when there is no database, shell, or eval sink
✗ Function parameters (a, b, x, y, n) — these are normal variables
✗ Arithmetic operations (+, -, *, /, %)
✗ Return statements
✗ console.log / console.error statements
✗ Variable declarations with safe literal values
✗ Import / require of packages (unless dynamic with user input)
✗ Array or object access with hardcoded numeric or string keys
✗ Comments, whitespace, or empty files

Respond ONLY with valid JSON. No explanations, no markdown outside JSON.`;

function buildUserPrompt(filename: string, language: string, code: string): string {
  return `Analyze the ${language} code below for security vulnerabilities.
Apply all evidence requirements from your instructions strictly.

════════════════════════════════════════
EXAMPLES OF CORRECT BEHAVIOR
════════════════════════════════════════

─── Safe Example A — Arithmetic function ───
Code:
  function add(a, b) { return a + b; }

Correct output: {"vulnerabilities": []}
Why: No database call, no eval, no shell, no file system, no credentials.
     Function parameters are safe variables. Arithmetic is not a vulnerability.

─── Safe Example B — String concat without a sink ───
Code:
  const greeting = "Hello, " + username;
  console.log(greeting);

Correct output: {"vulnerabilities": []}
Why: String concatenation is only dangerous when passed into a db query,
     eval(), shell command, or innerHTML. Here it goes to console.log only.

─── Vulnerable Example C — SQL Injection (db call + concat) ───
Code:
  const result = await db.query("SELECT * FROM users WHERE id=" + userId);

Correct output:
{
  "vulnerabilities": [
    {
      "name": "SQL Injection",
      "description": "User-controlled variable is concatenated directly into a SQL query string without parameterization.",
      "severity": "CRITICAL",
      "owasp_id": "A03:2021",
      "owasp_category": "Injection",
      "cwe_id": "CWE-89",
      "line_number": 1,
      "line_end": 1,
      "vulnerable_code": "db.query(\\"SELECT * FROM users WHERE id=\\" + userId)",
      "fixed_code": "db.query(\\"SELECT * FROM users WHERE id=$1\\", [userId])",
      "ai_explanation": "EVIDENCE: db.query() at line 1 receives a string built with '+' using external variable 'userId'. An attacker controlling userId can break out of the query structure.",
      "ai_fix_explanation": "Use parameterized queries to pass user data separately from the query structure.",
      "why_ai_makes_this_mistake": "AI defaults to string concatenation because it is simpler to write than parameterized queries."
    }
  ]
}

─── Vulnerable Example D — Code Injection via eval() ───
Code:
  function runUserCode(input) { eval(input); }

Correct output:
{
  "vulnerabilities": [
    {
      "name": "Code Injection via eval()",
      "description": "eval() executes its argument as JavaScript code. Passing external input allows arbitrary code execution.",
      "severity": "CRITICAL",
      "owasp_id": "A03:2021",
      "owasp_category": "Injection",
      "cwe_id": "CWE-94",
      "line_number": 1,
      "line_end": 1,
      "vulnerable_code": "eval(input)",
      "fixed_code": "// Remove eval(). Use JSON.parse() for data, or a safe expression parser library.",
      "ai_explanation": "EVIDENCE: eval() at line 1 directly receives function parameter 'input' with no sanitization between input and execution.",
      "ai_fix_explanation": "Never pass unsanitized external input to eval(). Redesign to avoid dynamic code execution.",
      "why_ai_makes_this_mistake": "AI uses eval() as a shortcut for dynamic behavior without considering that it grants full code execution to the caller."
    }
  ]
}

─── Vulnerable Example E — Hardcoded API Key ───
Code:
  const stripeKey = "REDACTED_EXAMPLE_STRIPE_KEY_FOR_AI_TRAINING";

Correct output:
{
  "vulnerabilities": [
    {
      "name": "Hardcoded API Key",
      "description": "A Stripe API key is embedded as a literal string in source code.",
      "severity": "HIGH",
      "owasp_id": "A02:2021",
      "owasp_category": "Cryptographic Failures",
      "cwe_id": "CWE-798",
      "line_number": 1,
      "line_end": 1,
      "vulnerable_code": "const stripeKey = \\"REDACTED_EXAMPLE_STRIPE_KEY_FOR_AI_TRAINING\\"",
      "fixed_code": "const stripeKey = process.env.STRIPE_API_KEY;",
      "ai_explanation": "EVIDENCE: Variable named 'stripeKey' at line 1 is assigned a literal string that looks like a Stripe key.",
      "ai_fix_explanation": "API keys should never be hardcoded. Store them in environment variables or a secure vault.",
      "why_ai_makes_this_mistake": "AI assumes the key is just an example string, ignoring the risk of committing it to version control."
    }
  ]
}

════════════════════════════════════════
NOW ANALYZE THIS CODE
════════════════════════════════════════

File: ${filename}
Language: ${language}

\`\`\`${language}
${code}
\`\`\`

Use this JSON schema (replace <placeholders> with real values from the code above):
{
  "vulnerabilities": [
    {
      "name": "<specific vulnerability name>",
      "description": "<one sentence: what is wrong and why it is dangerous>",
      "severity": "<CRITICAL | HIGH | MEDIUM | LOW | INFO>",
      "owasp_id": "<e.g. A03:2021>",
      "owasp_category": "<category name>",
      "cwe_id": "<e.g. CWE-89>",
      "line_number": 0,
      "line_end": 0,
      "vulnerable_code": "<exact vulnerable line(s) from the code above>",
      "fixed_code": "<working replacement that fixes the issue>",
      "ai_explanation": "EVIDENCE: <name the specific function/token at the specific line that proves exploitability — required>",
      "ai_fix_explanation": "<how to fix it in plain language>",
      "why_ai_makes_this_mistake": "<why AI-generated code produces this pattern>"
    }
  ]
}

FINAL REMINDER: If the code above has no exploitable vulnerabilities,
return exactly: {"vulnerabilities": []}
An empty array is the correct answer for safe code. Do not invent findings.`;
}

export async function analyzeFileWithAI(file: FileToScan, scanId: string): Promise<ParsedVulnerability[]> {
  const trimmedContent = file.content.trim();
  const lineCount = file.lineCount || file.content.split('\n').length;

  // Warn if a tiny file still has dangerous patterns (for observability)
  const DANGEROUS_PATTERNS = ['eval(', 'exec(', 'child_process', 'dangerouslySetInnerHTML'];
  const hasDangerousPattern = DANGEROUS_PATTERNS.some(p => file.content.includes(p));

  if (trimmedContent.length < 10) {
    if (hasDangerousPattern) {
      console.warn(`⚠️  Skipping AI for tiny file but dangerous pattern detected: ${file.name}`);
    } else {
      console.log(`⏭️  Skipping AI analysis: file too small (${trimmedContent.length} chars)`);
    }
    return [];
  }

  console.log(`🤖 Sending to AI: ${file.name} (${trimmedContent.length} chars, ${lineCount} lines)`);
  const chunks = lineCount > 500 ? chunkCode(file.content, 400, 50) : [file.content];
  
  const allVulnerabilities: ParsedVulnerability[] = [];

  for (const chunk of chunks) {
    const userPrompt = buildUserPrompt(file.name, file.language, chunk);
    
    try {
      // ─── Attempt 1 ───────────────────────────────────────────────
      console.log(`🤖 Attempt 1: calling Ollama for ${file.name}`);
      const response = await Promise.race([
        ollama.chat({
          model: MODEL_NAME,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          format: 'json',
          options: {
            temperature: 0.1,
            top_p: 0.1,
            top_k: 10,
            repeat_penalty: 1.1,
            num_ctx: 8192,
            num_predict: 4096
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI Analysis Timeout')), AI_TIMEOUT_MS)
        )
      ]);

      const jsonStr = extractJSON(response.message.content);
      let parsed: any = null;

      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseError1) {
        // ─── Attempt 2 (retry once, 100ms backoff) ────────────────
        console.warn(`⚠️ Attempt 1 JSON parse failed for ${file.name}: ${parseError1}`);
        console.warn(`⚠️ Raw output (first 300 chars): ${jsonStr.substring(0, 300)}`);
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
          console.log(`⚠️ Attempt 2: retrying Ollama for ${file.name}`);
          const retryResponse = await Promise.race([
            ollama.chat({
              model: MODEL_NAME,
              messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
              ],
              format: 'json',
              options: {
                temperature: 0.1,
                top_p: 0.1,
                top_k: 10,
                repeat_penalty: 1.1,
                num_ctx: 8192,
                num_predict: 4096
              }
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('AI Analysis Timeout')), AI_TIMEOUT_MS)
            )
          ]);
          parsed = JSON.parse(extractJSON(retryResponse.message.content));
        } catch (parseError2) {
          console.error(`❌ Both parse attempts failed for ${file.name}.`);
          console.error(`   Attempt 2 error: ${parseError2}`);
          // Return empty — never return fake data
          continue;
        }
      }

      if (parsed?.vulnerabilities && Array.isArray(parsed.vulnerabilities)) {
        for (const vuln of parsed.vulnerabilities) {
          if (vuln.name && vuln.description && vuln.severity) {
            const validSeverities: VulnerabilitySeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
            if (!validSeverities.includes(vuln.severity)) continue;

            allVulnerabilities.push({
              ...vuln,
              detection_method: 'ai',
              tool_name: 'ollama',
              file_path: file.path,
              line_number: parseInt(vuln.line_number as any) || 1
            });
          }
        }
      }
    } catch (error: any) {
      console.warn(`⚠️ Ollama analysis failed for ${file.name}: ${error.message}`);
      throw error; // Rethrow to let caller decide whether to try Gemini
    }
  }
  
  console.log(`✅ AI returned ${allVulnerabilities.length} vulnerabilities for ${file.name}`);
  return allVulnerabilities;
}

async function analyzeCodeWithGemini(file: FileToScan, scanId: string): Promise<ParsedVulnerability[]> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return [];

  const trimmedContentGemini = file.content.trim();
  if (trimmedContentGemini.length < 10) return [];

  const lineCount = file.lineCount || file.content.split('\n').length;

  const chunks = lineCount > 500 ? chunkCode(file.content, 400, 50) : [file.content];
  const allVulnerabilities: ParsedVulnerability[] = [];

  for (const chunk of chunks) {
    const userPrompt = buildUserPrompt(file.name, file.language, chunk);
    
    try {
      const responsePromise = fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }]
          }]
        })
      });

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Gemini Analysis Timeout')), AI_TIMEOUT_MS)
      );

      const response = await Promise.race([responsePromise, timeoutPromise]) as Response;
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonStr = extractJSON(content);
      
      try {
        const result = JSON.parse(jsonStr);
        if (result.vulnerabilities && Array.isArray(result.vulnerabilities)) {
          for (const vuln of result.vulnerabilities) {
            if (vuln.name && vuln.description && vuln.severity) {
              const validSeverities: VulnerabilitySeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
              if (!validSeverities.includes(vuln.severity)) continue;
              
              allVulnerabilities.push({
                ...vuln,
                detection_method: 'ai',
                tool_name: 'gemini',
                file_path: file.path,
                line_number: parseInt(vuln.line_number as any) || 1
              });
            }
          }
        }
      } catch (parseError) {
        console.error(`⚠️ Failed to parse Gemini JSON for ${file.name}:`);
        console.error(jsonStr.substring(0, 500) + '...');
      }
    } catch (error: any) {
      console.error(`❌ Gemini analysis failed for ${file.name}: ${error.message}`);
    }
  }

  if (allVulnerabilities.length > 0) {
    console.log(`🤖 Gemini found ${allVulnerabilities.length} vulnerabilities in ${file.name}`);
  }
  return allVulnerabilities;
}

export async function runAIAnalysis(files: FileToScan[], scanId: string): Promise<ParsedVulnerability[]> {
  const isOllamaReady = await checkOllamaHealth();
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const allVulnerabilities: ParsedVulnerability[] = [];

  if (!isOllamaReady && !GEMINI_API_KEY) {
    console.log("❌ No AI analyzer available");
    return [];
  }

  for (const file of files) {
    let success = false;
    
    if (isOllamaReady) {
      try {
        const results = await analyzeFileWithAI(file, scanId);
        allVulnerabilities.push(...results);
        success = true;
      } catch (error) {
        console.warn(`⚠️ Ollama failed for ${file.name}, trying Gemini...`);
      }
    }
    
    if (!success && GEMINI_API_KEY) {
      console.log(`🔄 Using Gemini as fallback for ${file.name}`);
      try {
        const results = await analyzeCodeWithGemini(file, scanId);
        allVulnerabilities.push(...results);
      } catch (error: any) {
        console.error(`❌ AI analysis failed for ${file.name}: ${error.message}`);
      }
    }
  }

  console.log(`📊 Total AI vulnerabilities: ${allVulnerabilities.length}`);
  return allVulnerabilities;
}
