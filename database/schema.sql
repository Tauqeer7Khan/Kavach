-- schema.sql

-- 1. users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    github_id VARCHAR(100) UNIQUE,
    github_username VARCHAR(100),
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    scans_used_this_month INTEGER DEFAULT 0,
    scans_limit INTEGER DEFAULT 15,
    last_reset_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    repo_url VARCHAR(500),
    source_type VARCHAR(20) CHECK (source_type IN ('upload', 'github', 'paste')),
    primary_language VARCHAR(50),
    languages JSONB DEFAULT '[]'::jsonb,
    total_scans INTEGER DEFAULT 0,
    last_scan_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. scans
CREATE TABLE scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'downloading', 'scanning', 'analyzing', 'scoring', 'completed', 'failed')),
    queue_position INTEGER,
    progress_percentage INTEGER DEFAULT 0,
    progress_message TEXT,
    security_score INTEGER,
    grade VARCHAR(2),
    total_vulnerabilities INTEGER DEFAULT 0,
    critical_count INTEGER DEFAULT 0,
    high_count INTEGER DEFAULT 0,
    medium_count INTEGER DEFAULT 0,
    low_count INTEGER DEFAULT 0,
    info_count INTEGER DEFAULT 0,
    files_scanned INTEGER DEFAULT 0,
    lines_scanned INTEGER DEFAULT 0,
    languages_detected JSONB DEFAULT '[]'::jsonb,
    scan_duration_seconds INTEGER,
    analysis_engine VARCHAR(20) DEFAULT 'ollama',
    llm_model VARCHAR(100) DEFAULT 'llama3.1:8b',
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. vulnerabilities
CREATE TABLE vulnerabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    vuln_code VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(10) CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO')),
    owasp_category VARCHAR(100),
    owasp_id VARCHAR(20),
    cwe_id VARCHAR(20),
    file_path VARCHAR(500),
    line_number INTEGER,
    line_end INTEGER,
    vulnerable_code TEXT,
    fixed_code TEXT,
    ai_explanation TEXT,
    ai_fix_explanation TEXT,
    why_ai_makes_this_mistake TEXT,
    detection_method VARCHAR(20) CHECK (detection_method IN ('static', 'ai', 'secret', 'dependency')),
    tool_name VARCHAR(50),
    is_false_positive BOOLEAN DEFAULT false,
    is_fixed BOOLEAN DEFAULT false,
    false_positive_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. scan_files
CREATE TABLE scan_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    language VARCHAR(50),
    line_count INTEGER,
    file_size_bytes INTEGER,
    r2_storage_key VARCHAR(500),
    has_vulnerabilities BOOLEAN DEFAULT false,
    vulnerability_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. scan_queue
CREATE TABLE scan_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    priority INTEGER DEFAULT 0,
    position INTEGER,
    job_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_scans_user_id ON scans(user_id);
CREATE INDEX idx_scans_project_id ON scans(project_id);
CREATE INDEX idx_scans_status ON scans(status);
CREATE INDEX idx_scans_created_at_desc ON scans(created_at DESC);
CREATE INDEX idx_vulnerabilities_scan_id ON vulnerabilities(scan_id);
CREATE INDEX idx_vulnerabilities_severity ON vulnerabilities(severity);
CREATE INDEX idx_scan_files_scan_id ON scan_files(scan_id);

-- ENABLE RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_queue ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- Users
CREATE POLICY "Users can view their own row"
ON users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own row"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Projects
CREATE POLICY "Users can do ALL on their own projects"
ON projects FOR ALL
USING (auth.uid() = user_id);

-- Scans
CREATE POLICY "Users can do ALL on their own scans"
ON scans FOR ALL
USING (auth.uid() = user_id);

-- Vulnerabilities
CREATE POLICY "Users can SELECT their own vulnerabilities"
ON vulnerabilities FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM scans 
        WHERE scans.id = vulnerabilities.scan_id 
        AND scans.user_id = auth.uid()
    )
);

-- Note: Service role automatically bypasses RLS in Supabase.

-- FUNCTIONS

-- 1. calculate_scan_grade
CREATE OR REPLACE FUNCTION calculate_scan_grade(score INTEGER)
RETURNS VARCHAR(2) AS $$
BEGIN
    IF score >= 90 THEN RETURN 'A+';
    ELSIF score >= 80 THEN RETURN 'A';
    ELSIF score >= 70 THEN RETURN 'B';
    ELSIF score >= 60 THEN RETURN 'C';
    ELSIF score >= 50 THEN RETURN 'D';
    ELSE RETURN 'F';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. reset_monthly_scans
CREATE OR REPLACE FUNCTION reset_monthly_scans()
RETURNS void AS $$
BEGIN
    UPDATE users
    SET scans_used_this_month = 0,
        last_reset_date = CURRENT_DATE
    WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- 3. update_updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for update_updated_at
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 7. scan_file_contents
CREATE TABLE IF NOT EXISTS scan_file_contents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id         UUID REFERENCES scans(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  file_path       TEXT NOT NULL,
  file_content    TEXT NOT NULL,
  language        VARCHAR(50),
  line_count      INTEGER,
  r2_key          TEXT,
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_file_contents_scan_id 
  ON scan_file_contents(scan_id);

CREATE INDEX IF NOT EXISTS idx_scan_file_contents_expires_at 
  ON scan_file_contents(expires_at);

-- 8. auto_fix_jobs
CREATE TABLE IF NOT EXISTS auto_fix_jobs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id               UUID REFERENCES scans(id) ON DELETE CASCADE,
  user_id               UUID REFERENCES users(id) ON DELETE CASCADE,
  status                VARCHAR(20) DEFAULT 'pending',
  vulnerability_ids     JSONB DEFAULT '[]'::jsonb,
  fixed_files           JSONB DEFAULT '[]'::jsonb,
  total_vulns           INTEGER DEFAULT 0,
  fixed_count           INTEGER DEFAULT 0,
  skipped_count         INTEGER DEFAULT 0,
  failed_count          INTEGER DEFAULT 0,
  error_message         TEXT,
  progress_percentage   INTEGER DEFAULT 0,
  progress_message      TEXT,
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_fix_jobs_scan_id 
  ON auto_fix_jobs(scan_id);

CREATE INDEX IF NOT EXISTS idx_auto_fix_jobs_user_id 
  ON auto_fix_jobs(user_id);

-- ─────────────────────────────────────────────────────────
-- github_prs — Track PRs created by KAVACH (Phase 3)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS github_prs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id               UUID REFERENCES scans(id) ON DELETE CASCADE,
  fix_job_id            UUID REFERENCES auto_fix_jobs(id) ON DELETE CASCADE,
  user_id               UUID REFERENCES users(id) ON DELETE CASCADE,

  repo_owner            VARCHAR(200) NOT NULL,
  repo_name             VARCHAR(200) NOT NULL,
  base_branch           VARCHAR(200) NOT NULL,
  head_branch           VARCHAR(200) NOT NULL,

  pr_number             INTEGER,
  pr_url                TEXT,
  pr_title              TEXT,

  files_pushed          INTEGER DEFAULT 0,
  vulnerabilities_fixed INTEGER DEFAULT 0,

  status                VARCHAR(20) DEFAULT 'pending',
  -- pending, creating, created, failed

  error_message         TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_prs_scan_id
  ON github_prs(scan_id);

CREATE INDEX IF NOT EXISTS idx_github_prs_user_id
  ON github_prs(user_id);
