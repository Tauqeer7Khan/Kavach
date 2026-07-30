import { Ollama } from 'ollama';
import { ParsedVulnerability, FileToScan, VulnerabilitySeverity } from '../../types';

const ollama = new Ollama({ 
  host: process.env.OLLAMA_HOST || 'http://localhost:11434' 
});

const MODEL_NAME = process.env.OLLAMA_MODEL || 'llama3.1:8b';
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

const SYSTEM_PROMPT = `You are KAVACH, an expert application security engineer specializing in finding security vulnerabilities in AI-generated code (code written by ChatGPT, GitHub Copilot, Cursor, Bolt.new, v0.dev, Claude, Gemini).

AI-generated code commonly has these vulnerability patterns:
1. SQL Injection - AI uses string concatenation instead of parameterized queries
2. XSS (Cross-Site Scripting) - AI skips output encoding/sanitization
3. Hardcoded secrets - AI puts placeholder credentials in code
4. Missing input validation - AI focuses on happy path, skips validation
5. Broken authentication - AI implements basic auth without security controls
6. Insecure CORS - AI uses wildcard (*) origins
7. Missing rate limiting - AI never adds rate limiting to APIs
8. Path traversal - AI uses user input directly in file paths
9. Command injection - AI concatenates user input into shell commands
10. Insecure direct object references - AI exposes internal IDs directly
11. Missing CSRF protection - AI builds forms without CSRF tokens
12. Weak cryptography - AI uses MD5/SHA1 for passwords
13. Debug endpoints left open - AI leaves /debug, /test, /admin open
14. Verbose error messages - AI leaks stack traces to users
15. Missing authorization checks - AI adds authentication but forgets authorization

CRITICAL RULES:
- Only report REAL security vulnerabilities, not code style issues
- Do NOT report missing semicolons, variable naming, or performance issues
- Focus on vulnerabilities that could be EXPLOITED by an attacker
- Be specific about WHICH line has the vulnerability
- Provide WORKING fixed code that actually solves the issue
- Explain in simple language that a non-security expert can understand

Respond ONLY with valid JSON. No markdown outside JSON, no explanations before or after the JSON.`;

function buildUserPrompt(filename: string, language: string, code: string): string {
  return `Analyze this ${language} code file for security vulnerabilities.
File: ${filename}

\`\`\`${language}
${code}
\`\`\`

Return a JSON object with this EXACT structure (no other text):
{
  "vulnerabilities": [
    {
      "name": "SQL Injection via String Concatenation",
      "description": "User input is directly concatenated into SQL query allowing injection.",
      "severity": "CRITICAL",
      "owasp_id": "A03:2021",
      "owasp_category": "Injection",
      "cwe_id": "CWE-89",
      "line_number": 45,
      "line_end": 47,
      "vulnerable_code": "const query = 'SELECT * FROM users WHERE id = ' + userId",
      "fixed_code": "const query = 'SELECT * FROM users WHERE id = $1';\\nawait db.query(query, [userId]);",
      "ai_explanation": "This code concatenates user input directly into SQL. An attacker can inject malicious SQL.",
      "ai_fix_explanation": "Use parameterized queries to safely separate query structure from data.",
      "why_ai_makes_this_mistake": "AI models see many examples using string concatenation and default to that pattern without security context."
    }
  ]
}

If no vulnerabilities found, return: {"vulnerabilities": []}`;
}

export async function analyzeFileWithAI(file: FileToScan, scanId: string): Promise<ParsedVulnerability[]> {
  const lineCount = file.lineCount || file.content.split('\n').length;
  if (lineCount < 5) return [];

  console.log(`🤖 Analyzing ${file.name} (${lineCount} lines)...`);
  const chunks = lineCount > 500 ? chunkCode(file.content, 400, 50) : [file.content];
  
  const allVulnerabilities: ParsedVulnerability[] = [];

  for (const chunk of chunks) {
    const userPrompt = buildUserPrompt(file.name, file.language, chunk);
    
    try {
      const responsePromise = ollama.chat({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        format: 'json',
        options: {
          temperature: 0.1,
          num_ctx: 8192,
          num_predict: 4096
        }
      });

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('AI Analysis Timeout')), AI_TIMEOUT_MS)
      );

      const response = await Promise.race([responsePromise, timeoutPromise]);
      const jsonStr = extractJSON(response.message.content);
      
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
                tool_name: 'ollama',
                file_path: file.path,
                line_number: parseInt(vuln.line_number as any) || 1
              });
            }
          }
        }
      } catch (parseError) {
        console.error(`⚠️ Failed to parse JSON for ${file.name}:`);
        console.error(jsonStr.substring(0, 500) + '...');
      }
    } catch (error: any) {
      console.warn(`⚠️ Ollama analysis failed for ${file.name}: ${error.message}`);
      throw error; // Rethrow to let caller decide whether to try Gemini
    }
  }
  
  if (allVulnerabilities.length > 0) {
    console.log(`🤖 Found ${allVulnerabilities.length} vulnerabilities in ${file.name}`);
  }
  return allVulnerabilities;
}

async function analyzeCodeWithGemini(file: FileToScan, scanId: string): Promise<ParsedVulnerability[]> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return [];

  const lineCount = file.lineCount || file.content.split('\n').length;
  if (lineCount < 5) return [];

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
