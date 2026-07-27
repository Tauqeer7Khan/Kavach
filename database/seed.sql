-- seed.sql

-- Insert 1 test user
INSERT INTO users (id, email, name, github_username, plan)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'test@kavach.ai',
    'Test User',
    'testuser',
    'pro'
);

-- Insert 2 test projects
INSERT INTO projects (id, user_id, name, description, repo_url, source_type, primary_language)
VALUES 
(
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111111',
    'Payment Gateway',
    'Core payment processing service',
    'https://github.com/testuser/payment-gateway',
    'github',
    'TypeScript'
),
(
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Auth Service',
    'JWT Authentication microservice',
    'https://github.com/testuser/auth-service',
    'github',
    'Go'
);

-- Insert 1 completed scan
INSERT INTO scans (id, project_id, user_id, status, security_score, grade, total_vulnerabilities, critical_count, high_count, medium_count, low_count, info_count, files_scanned, lines_scanned)
VALUES (
    '33333333-3333-3333-3333-333333333331',
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111111',
    'completed',
    72,
    'B',
    5,
    1,
    1,
    1,
    1,
    1,
    15,
    2500
);

-- Insert 5 vulnerabilities for the completed scan (mix of severities)
INSERT INTO vulnerabilities (scan_id, vuln_code, name, description, severity, file_path, line_number)
VALUES 
(
    '33333333-3333-3333-3333-333333333331',
    'KAVACH-001',
    'SQL Injection',
    'Unsanitized user input used in raw SQL query.',
    'CRITICAL',
    'src/db/queries.ts',
    42
),
(
    '33333333-3333-3333-3333-333333333331',
    'KAVACH-002',
    'Hardcoded API Key',
    'Stripe API key is hardcoded in the codebase.',
    'HIGH',
    'src/config/stripe.ts',
    12
),
(
    '33333333-3333-3333-3333-333333333331',
    'KAVACH-003',
    'Cross-Site Scripting (XSS)',
    'Unescaped output rendered in HTML template.',
    'MEDIUM',
    'src/views/checkout.tsx',
    85
),
(
    '33333333-3333-3333-3333-333333333331',
    'KAVACH-004',
    'Missing Rate Limiting',
    'Login endpoint does not have rate limiting.',
    'LOW',
    'src/routes/auth.ts',
    23
),
(
    '33333333-3333-3333-3333-333333333331',
    'KAVACH-005',
    'Console Log in Production',
    'Sensitive user data logged to console.',
    'INFO',
    'src/controllers/payment.ts',
    56
);

-- Insert 1 queued scan
INSERT INTO scans (id, project_id, user_id, status, queue_position)
VALUES (
    '33333333-3333-3333-3333-333333333332',
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'queued',
    1
);
