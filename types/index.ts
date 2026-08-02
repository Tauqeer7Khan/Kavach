// ================================
// DATABASE TYPES (match Supabase schema exactly)
// ================================

export type UserPlan = 'free' | 'pro' | 'enterprise'

export type ScanStatus = 
  | 'queued' 
  | 'downloading' 
  | 'scanning' 
  | 'analyzing' 
  | 'scoring' 
  | 'completed' 
  | 'failed'

export type VulnerabilitySeverity = 
  | 'CRITICAL' 
  | 'HIGH' 
  | 'MEDIUM' 
  | 'LOW' 
  | 'INFO'

export type DetectionMethod = 'static' | 'ai' | 'secret' | 'dependency'

export type SourceType = 'upload' | 'github' | 'paste'

export type ScanGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

// Full database row types
export interface User {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  github_id: string | null
  github_username: string | null
  plan: UserPlan
  scans_used_this_month: number
  scans_limit: number
  last_reset_date: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  repo_url: string | null
  source_type: SourceType | null
  primary_language: string | null
  languages: string[]
  total_scans: number
  last_scan_score: number | null
  created_at: string
  updated_at: string
}

export interface Scan {
  id: string
  project_id: string
  user_id: string
  status: ScanStatus
  queue_position: number | null
  progress_percentage: number
  progress_message: string | null
  security_score: number | null
  grade: ScanGrade | null
  total_vulnerabilities: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  info_count: number
  files_scanned: number
  lines_scanned: number
  languages_detected: string[]
  scan_duration_seconds: number | null
  analysis_engine: string
  llm_model: string
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export interface Vulnerability {
  id: string
  scan_id: string
  vuln_code: string | null
  name: string
  description: string | null
  severity: VulnerabilitySeverity | null
  owasp_category: string | null
  owasp_id: string | null
  cwe_id: string | null
  file_path: string | null
  line_number: number | null
  line_end: number | null
  vulnerable_code: string | null
  fixed_code: string | null
  ai_explanation: string | null
  ai_fix_explanation: string | null
  why_ai_makes_this_mistake: string | null
  detection_method: DetectionMethod | null
  tool_name: string | null
  is_false_positive: boolean
  is_fixed: boolean
  false_positive_reason: string | null
  created_at: string
}

export interface ScanFile {
  id: string
  scan_id: string
  file_path: string | null
  file_name: string | null
  language: string | null
  line_count: number | null
  file_size_bytes: number | null
  r2_storage_key: string | null
  has_vulnerabilities: boolean
  vulnerability_count: number
  created_at: string
}

export interface ScanQueue {
  id: string
  scan_id: string
  user_id: string
  priority: number
  position: number | null
  job_id: string | null
  created_at: string
}

// ================================
// API REQUEST/RESPONSE TYPES
// ================================

export interface CreateScanRequest {
  projectName: string
  sourceType: SourceType
  repoUrl?: string
  pastedCode?: string
  language?: string
}

export interface CreateScanResponse {
  scanId: string
  projectId: string
  jobId: string
  queuePosition: number
  estimatedWaitSeconds: number
  message: string
}

export interface ScanStatusResponse {
  scan: Scan
  queuePosition?: number
  estimatedWaitSeconds?: number
}

export interface ScanReportResponse {
  scan: Scan
  vulnerabilities: Vulnerability[]
  files: ScanFile[]
  owaspBreakdown: OWASPBreakdown[]
  severityBreakdown: SeverityBreakdown[]
  topVulnerableFiles: TopVulnerableFile[]
}

// ================================
// ANALYSIS ENGINE TYPES
// ================================

export interface ParsedVulnerability {
  name: string
  description: string
  severity: VulnerabilitySeverity
  owasp_category: string
  owasp_id: string
  cwe_id: string
  file_path: string
  line_number: number
  line_end?: number
  vulnerable_code: string
  fixed_code: string
  ai_explanation: string
  ai_fix_explanation: string
  why_ai_makes_this_mistake: string
  detection_method: DetectionMethod
  tool_name: string
}

export interface SemgrepResult {
  // Add Semgrep specific result fields here
  [key: string]: any
}

export interface GitleaksResult {
  // Add Gitleaks specific result fields here
  [key: string]: any
}

export interface OllamaAnalysisResult {
  // Add Ollama specific result fields here
  [key: string]: any
}

export interface FileToScan {
  path: string
  name: string
  content: string
  language: string
  lineCount: number
  sizeBytes: number
}

export interface ScanJob {
  scanId: string
  projectId: string
  userId: string
  files: FileToScan[]
  sourceType: SourceType
  repoUrl?: string
  r2Keys?: string[]
  pastedCode?: string
  language?: string
}

// ================================
// UI/DASHBOARD TYPES
// ================================

export interface OWASPBreakdown {
  category: string
  id: string
  count: number
  percentage: number
}

export interface SeverityBreakdown {
  severity: VulnerabilitySeverity
  count: number
  percentage: number
  color: string
}

export interface TopVulnerableFile {
  filePath: string
  fileName: string
  language: string
  vulnerabilityCount: number
  highestSeverity: VulnerabilitySeverity
}

export interface SecurityScoreConfig {
  score: number
  grade: ScanGrade
  label: string
  color: string
  bgColor: string
  description: string
}

// ================================
// LANGUAGE DETECTION TYPES  
// ================================

export type SupportedLanguage = 
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'php'
  | 'java'
  | 'go'
  | 'ruby'
  | 'rust'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'unknown'

export interface LanguageConfig {
  name: string
  extensions: string[]
  semgrepLanguage: string
  color: string
  icon: string
}

export const LANGUAGE_CONFIGS: Record<SupportedLanguage, LanguageConfig> = {
  javascript: {
    name: 'JavaScript',
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    semgrepLanguage: 'javascript',
    color: '#F7DF1E',
    icon: 'javascript'
  },
  typescript: {
    name: 'TypeScript',
    extensions: ['.ts', '.tsx'],
    semgrepLanguage: 'typescript',
    color: '#3178C6',
    icon: 'typescript'
  },
  python: {
    name: 'Python',
    extensions: ['.py', '.pyw'],
    semgrepLanguage: 'python',
    color: '#3776AB',
    icon: 'python'
  },
  php: {
    name: 'PHP',
    extensions: ['.php', '.phtml', '.php5'],
    semgrepLanguage: 'php',
    color: '#777BB4',
    icon: 'php'
  },
  java: {
    name: 'Java',
    extensions: ['.java'],
    semgrepLanguage: 'java',
    color: '#007396',
    icon: 'java'
  },
  go: {
    name: 'Go',
    extensions: ['.go'],
    semgrepLanguage: 'go',
    color: '#00ADD8',
    icon: 'go'
  },
  ruby: {
    name: 'Ruby',
    extensions: ['.rb', '.erb'],
    semgrepLanguage: 'ruby',
    color: '#CC342D',
    icon: 'ruby'
  },
  rust: {
    name: 'Rust',
    extensions: ['.rs'],
    semgrepLanguage: 'rust',
    color: '#000000',
    icon: 'rust'
  },
  c: {
    name: 'C',
    extensions: ['.c', '.h'],
    semgrepLanguage: 'c',
    color: '#A8B9CC',
    icon: 'c'
  },
  cpp: {
    name: 'C++',
    extensions: ['.cpp', '.cc', '.cxx', '.hpp', '.hh'],
    semgrepLanguage: 'cpp',
    color: '#00599C',
    icon: 'cpp'
  },
  csharp: {
    name: 'C#',
    extensions: ['.cs'],
    semgrepLanguage: 'csharp',
    color: '#239120',
    icon: 'csharp'
  },
  unknown: {
    name: 'Unknown',
    extensions: [],
    semgrepLanguage: 'generic',
    color: '#6e7681',
    icon: 'file'
  }
}

export const SEVERITY_CONFIG: Record<VulnerabilitySeverity, { color: string; bgColor: string; icon: string; label: string }> = {
  CRITICAL: {
    color: '#EF4444',
    bgColor: '#FEE2E2',
    icon: 'alert-triangle',
    label: 'Critical'
  },
  HIGH: {
    color: '#F97316',
    bgColor: '#FFEDD5',
    icon: 'alert-circle',
    label: 'High'
  },
  MEDIUM: {
    color: '#EAB308',
    bgColor: '#FEF9C3',
    icon: 'alert-circle',
    label: 'Medium'
  },
  LOW: {
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: 'info',
    label: 'Low'
  },
  INFO: {
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'info',
    label: 'Info'
  }
}

export const OWASP_TOP_10 = [
  { id: 'A01:2021', name: 'Broken Access Control' },
  { id: 'A02:2021', name: 'Cryptographic Failures' },
  { id: 'A03:2021', name: 'Injection' },
  { id: 'A04:2021', name: 'Insecure Design' },
  { id: 'A05:2021', name: 'Security Misconfiguration' },
  { id: 'A06:2021', name: 'Vulnerable and Outdated Components' },
  { id: 'A07:2021', name: 'Identification and Authentication Failures' },
  { id: 'A08:2021', name: 'Software and Data Integrity Failures' },
  { id: 'A09:2021', name: 'Security Logging and Monitoring Failures' },
  { id: 'A10:2021', name: 'Server-Side Request Forgery (SSRF)' }
]
