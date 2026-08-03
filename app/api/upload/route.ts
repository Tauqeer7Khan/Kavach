import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Validates file size and extension
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  const MAX_FILE_SIZE = 1024 * 1024; // 1 MB
  const ALLOWED_EXTENSIONS = [
    '.js', '.jsx', '.mjs', '.cjs',
    '.ts', '.tsx',
    '.py', '.pyw',
    '.php', '.phtml',
    '.java',
    '.go',
    '.rb', '.erb',
    '.rs',
    '.c', '.h',
    '.cpp', '.cc', '.cxx', '.hpp',
    '.cs'
  ];
  
  // Check size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File ${file.name} exceeds 1MB limit` };
  }
  
  // Check extension
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File type ${ext} not supported` };
  }
  
  return { valid: true };
}

/**
 * Sanitizes file name to prevent injection/path traversal issues and handle special characters
 */
function sanitizeFileName(fileName: string): string {
  if (!fileName) return `unnamed_${crypto.randomUUID().substring(0, 8)}`;
  
  // Replace anything that is not alphanumeric, dot, or dash with underscore
  let sanitized = fileName.replace(/[^a-zA-Z0-9.\-]/g, '_');
  
  // Truncate if too long (max 100 chars)
  if (sanitized.length > 100) {
    const ext = sanitized.split('.').pop() || '';
    const name = sanitized.substring(0, 95 - ext.length);
    sanitized = `${name}.${ext}`;
  }
  
  return sanitized;
}

/**
 * POST /api/upload
 * 
 * Secure file upload endpoint for uploading source code to Cloudflare R2.
 * Validates size, limits, extensions, and avoids duplicate/malicious paths.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > 50) {
      return NextResponse.json({ error: 'Exceeded maximum of 50 files per request' }, { status: 400 });
    }

    let totalSize = 0;
    const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10 MB

    // 3. Validate constraints
    const uniqueNames = new Set<string>();
    
    for (const file of files) {
      const validation = validateFile(file);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      
      const sanitizedName = sanitizeFileName(file.name);
      if (uniqueNames.has(sanitizedName)) {
        return NextResponse.json({ error: `Duplicate file name detected: ${sanitizedName}` }, { status: 400 });
      }
      uniqueNames.add(sanitizedName);
      
      totalSize += file.size;
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json({ error: 'Total size exceeds 10MB limit' }, { status: 400 });
    }

    // 4. Setup Cloudflare R2 client
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });

    // 5. Generate upload session ID
    const uploadSessionId = crypto.randomUUID();
    const uploadedKeys: string[] = [];

    // 6. For each file, upload to R2
    try {
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const sanitizedName = sanitizeFileName(file.name);
        const r2Key = `scans/${user.id}/${uploadSessionId}/${sanitizedName}`;
        
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: r2Key,
          Body: buffer,
          ContentType: file.type || 'text/plain',
          Metadata: {
            userId: user.id,
            uploadSessionId: uploadSessionId,
            originalName: encodeURIComponent(file.name), // Keep original name safe in metadata
          },
        }));
        
        uploadedKeys.push(r2Key);
      }
    } catch (uploadError: unknown) {
      console.error('R2 upload failed:', uploadError);
      
      // Try to clean up any partially uploaded files
      for (const key of uploadedKeys) {
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: key,
          }));
        } catch (cleanupError) {
          console.error(`Failed to clean up file ${key}:`, cleanupError);
        }
      }
      
      return NextResponse.json({ error: 'Failed to upload files to storage' }, { status: 500 });
    }

    console.log(`✅ Successfully uploaded ${files.length} files for user ${user.id} (Session: ${uploadSessionId})`);

    // 7. Return success response
    return NextResponse.json({
      success: true,
      uploadSessionId: uploadSessionId,
      fileCount: files.length,
      r2Keys: uploadedKeys,
      totalSizeBytes: totalSize,
      message: `Successfully uploaded ${files.length} files`
    });

  } catch (error: unknown) {
    console.error('POST /api/upload error:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Internal server error', message },
      { status: 500 }
    );
  }
}
