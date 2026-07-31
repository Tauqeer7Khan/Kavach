import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';
import { 
  ScanReportResponse, 
  OWASPBreakdown, 
  SeverityBreakdown, 
  TopVulnerableFile,
  VulnerabilitySeverity
} from '@/types';

const uuidSchema = z.string().uuid();

// Helpers
function detectLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    py: 'python', pyw: 'python',
    php: 'php',
    java: 'java',
    go: 'go',
    rb: 'ruby',
    rs: 'rust',
    c: 'c', h: 'c',
    cpp: 'cpp', cc: 'cpp',
    cs: 'csharp'
  };
  return map[ext] || 'unknown';
}

function getBasename(filePath: string): string {
  return filePath.split('/').pop() || filePath;
}

function getSeverityPriority(severity: string | null): number {
  if (!severity) return 5;
  const priority: Record<string, number> = {
    CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4
  };
  return priority[severity] ?? 5;
}

/**
 * GET /api/scan/[id]/report
 * 
 * Returns the COMPLETE scan report with all vulnerabilities, files, and analytics.
 * Used when a scan is completed and the user wants to see the full breakdown.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Validate scan ID format
    const scanId = params.id;
    const uuidValidation = uuidSchema.safeParse(scanId);
    
    if (!uuidValidation.success) {
      return NextResponse.json({ error: 'Invalid scan ID' }, { status: 400 });
    }

    // 2. Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Fetch scan from database
    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select('*')
      .eq('id', scanId)
      .single();

    if (scanError || !scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // 4. Verify ownership
    if (scan.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 5. Check scan is completed
    if (scan.status !== 'completed' && scan.status !== 'failed') {
      return NextResponse.json({
        status: scan.status,
        progress: scan.progress_percentage,
        message: 'Scan not yet complete. Poll /api/scan/[id] for status updates.'
      }, { status: 202 });
    }

    // 6. Fetch all vulnerabilities for this scan
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('*')
      .eq('scan_id', scanId);

    if (vulnError) {
      throw new Error(`Failed to fetch vulnerabilities: ${vulnError.message}`);
    }

    // Sort vulnerabilities in memory
    const sortedVulns = (vulnerabilities || []).sort((a, b) => {
      const pA = getSeverityPriority(a.severity);
      const pB = getSeverityPriority(b.severity);
      if (pA !== pB) return pA - pB;
      return (a.vuln_code || '').localeCompare(b.vuln_code || '');
    });

    // 7. Fetch scan files (if available)
    const { data: files, error: filesError } = await supabase
      .from('scan_files')
      .select('*')
      .eq('scan_id', scanId);
      
    const scanFiles = files || [];
    const totalVulns = sortedVulns.length;
    
    // 8. Build OWASP breakdown
    const owaspMap = new Map<string, { category: string; count: number }>();
    for (const v of sortedVulns) {
      const owaspId = v.owasp_id || 'Unknown';
      const owaspCat = v.owasp_category || 'Uncategorized';
      if (!owaspMap.has(owaspId)) {
        owaspMap.set(owaspId, { category: owaspCat, count: 0 });
      }
      owaspMap.get(owaspId)!.count += 1;
    }

    // Using Array.from map to iterate cleanly
    const owaspBreakdown: OWASPBreakdown[] = [];
    owaspMap.forEach((data, id) => {
      owaspBreakdown.push({
        category: data.category,
        id: id,
        count: data.count,
        percentage: totalVulns > 0 ? (data.count / totalVulns) * 100 : 0
      });
    });
    owaspBreakdown.sort((a, b) => b.count - a.count);

    // 9. Build severity breakdown
    const severityColors: Record<string, string> = {
      CRITICAL: '#dc2626',
      HIGH: '#ea580c',
      MEDIUM: '#eab308',
      LOW: '#3b82f6',
      INFO: '#6b7280'
    };

    const severityCounts: Record<string, number> = {
      CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0
    };

    for (const v of sortedVulns) {
      if (v.severity && severityCounts[v.severity] !== undefined) {
        severityCounts[v.severity]++;
      }
    }

    const severityBreakdown: SeverityBreakdown[] = Object.keys(severityCounts).map(sev => ({
      severity: sev as VulnerabilitySeverity,
      count: severityCounts[sev],
      percentage: totalVulns > 0 ? (severityCounts[sev] / totalVulns) * 100 : 0,
      color: severityColors[sev]
    }));

    // 10. Build top vulnerable files
    const fileMap = new Map<string, { count: number; highestSev: VulnerabilitySeverity }>();
    
    for (const v of sortedVulns) {
      const filePath = v.file_path || 'Unknown';
      if (!fileMap.has(filePath)) {
        fileMap.set(filePath, { count: 0, highestSev: 'INFO' });
      }
      
      const fileData = fileMap.get(filePath)!;
      fileData.count += 1;
      
      if (getSeverityPriority(v.severity) < getSeverityPriority(fileData.highestSev)) {
        fileData.highestSev = (v.severity as VulnerabilitySeverity) || 'INFO';
      }
    }

    const topVulnerableFiles: TopVulnerableFile[] = [];
    fileMap.forEach((data, path) => {
      topVulnerableFiles.push({
        filePath: path,
        fileName: getBasename(path),
        language: detectLanguageFromPath(path),
        vulnerabilityCount: data.count,
        highestSeverity: data.highestSev
      });
    });
    
    topVulnerableFiles.sort((a, b) => b.vulnerabilityCount - a.vulnerabilityCount);
    // Take top 5
    const top5Files = topVulnerableFiles.slice(0, 5);

    // 11. Return complete report
    const reportData: ScanReportResponse & { success: boolean } = {
      success: true,
      scan: scan,
      vulnerabilities: sortedVulns as any[],
      files: scanFiles as any[],
      owaspBreakdown,
      severityBreakdown,
      topVulnerableFiles: top5Files
    };

    const response = NextResponse.json(reportData);
    
    // Add caching headers for 5 minutes since completed scan data doesn't change
    response.headers.set('Cache-Control', 'private, max-age=300');
    
    return response;

  } catch (error: any) {
    console.error(`GET /api/scan/${params.id}/report error:`, error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
