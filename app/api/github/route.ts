import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';

const requestSchema = z.object({
  repoUrl: z.string().min(1, 'Repository URL is required').max(500, 'Repository URL is too long')
});

/**
 * Helper to estimate scan time based on repository size
 */
function estimateScanTime(sizeKB: number): string {
  const sizeMB = sizeKB / 1024;
  if (sizeMB < 5) return '1-2 minutes';
  if (sizeMB < 20) return '2-5 minutes';
  if (sizeMB < 50) return '5-10 minutes';
  if (sizeMB < 100) return '10-15 minutes';
  return '15+ minutes';
}

/**
 * Extracts the owner and repository name from various formats of GitHub URLs
 */
function extractOwnerAndRepo(url: string): { owner: string; repo: string } | null {
  // Clean the URL
  const cleanUrl = url.trim().replace(/\/$/, '');
  
  // Try each pattern
  const patterns = [
    /^https?:\/\/github\.com\/([^\/]+)\/([^\/\.]+)(?:\.git)?$/,
    /^git@github\.com:([^\/]+)\/([^\/\.]+)(?:\.git)?$/,
    /^github\.com\/([^\/]+)\/([^\/\.]+)$/
  ];
  
  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2]
      };
    }
  }
  
  return null;
}

/**
 * POST /api/github
 * 
 * Validates a GitHub repository URL before allowing a scan.
 * Checks format, existence, public visibility, and retrieves sizing metadata.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body with Zod
    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    
    const { repoUrl } = parseResult.data;

    // 2. Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3 & 4. Validate URL format and extract owner/repo
    const repoData = extractOwnerAndRepo(repoUrl);
    
    if (!repoData) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid GitHub URL format',
        example: 'https://github.com/username/repository'
      }, { status: 400 });
    }
    
    const { owner, repo } = repoData;

    // 5. Call GitHub API to verify repo exists
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'KAVACH-Security-Scanner'
        }
      }
    );

    // 6. Handle GitHub API responses
    if (response.status === 404) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Repository not found or is private',
        suggestion: 'Please check the URL or make repo public'
      }, { status: 404 });
    }
    
    if (response.status === 403 || response.status === 429) {
      return NextResponse.json({ 
        valid: false, 
        error: 'GitHub API rate limit exceeded',
        message: 'Please try again in a few minutes'
      }, { status: 429 });
    }
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch repository information' }, { status: 500 });
    }

    // 7. Check if repo is public
    const data = await response.json();
    
    if (data.private === true) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Private repositories require authentication',
        message: 'Please make the repo public or use file upload'
      }, { status: 400 });
    }

    // 8. Get useful metadata
    const metadata = {
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      defaultBranch: data.default_branch,
      language: data.language,
      sizeKB: data.size, // GitHub API returns size in KB
      stars: data.stargazers_count,
      forks: data.forks_count,
      isPrivate: data.private,
      isFork: data.fork,
      updatedAt: data.updated_at
    };

    // 9. Check size warning (large repos take longer)
    const sizeMB = metadata.sizeKB / 1024;
    let sizeWarning = null;
    
    if (sizeMB > 100) {
      sizeWarning = `This is a large repo (${sizeMB.toFixed(1)} MB). Scan may take 10+ minutes.`;
    } else if (sizeMB > 50) {
      sizeWarning = `Medium sized repo (${sizeMB.toFixed(1)} MB). Scan may take 5-10 minutes.`;
    }

    // 10. Return success response
    const successResponse = NextResponse.json({
      valid: true,
      repository: {
        name: metadata.name,
        fullName: metadata.fullName,
        description: metadata.description,
        defaultBranch: metadata.defaultBranch,
        language: metadata.language,
        sizeKB: metadata.sizeKB,
        stars: metadata.stars,
        forks: metadata.forks,
        updatedAt: metadata.updatedAt
      },
      sizeWarning,
      estimatedScanTime: estimateScanTime(metadata.sizeKB),
      message: 'Repository verified. Ready to scan.'
    });

    // CACHING: Since repo metadata doesn't change often, cache successful responses
    successResponse.headers.set('Cache-Control', 'private, max-age=300'); // 5 minutes
    
    return successResponse;

  } catch (error: any) {
    console.error('POST /api/github error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
