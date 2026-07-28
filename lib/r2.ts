import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  type ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!

export async function uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })

    await s3Client.send(command)
    return key
  } catch (error) {
    console.error('Error uploading file to R2:', error)
    throw error
  }
}

export async function downloadFile(key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })

    const response = await s3Client.send(command)
    if (!response.Body) {
      throw new Error('File not found or empty body')
    }

    const byteArray = await response.Body.transformToByteArray()
    return Buffer.from(byteArray)
  } catch (error) {
    console.error('Error downloading file from R2:', error)
    throw error
  }
}

export async function deleteFile(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
    await s3Client.send(command)
  } catch (error) {
    console.error('Error deleting file from R2:', error)
    throw error
  }
}

export async function deleteFolder(prefix: string): Promise<void> {
  try {
    let isTruncated = true
    let continuationToken: string | undefined

    while (isTruncated) {
      const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })

      const listResponse: ListObjectsV2CommandOutput = await s3Client.send(listCommand)

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        const deleteParams = {
          Bucket: R2_BUCKET_NAME,
          Delete: {
            Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key })),
          },
        }
        await s3Client.send(new DeleteObjectsCommand(deleteParams))
      }

      isTruncated = listResponse.IsTruncated ?? false
      continuationToken = listResponse.NextContinuationToken
    }
  } catch (error) {
    console.error('Error deleting folder from R2:', error)
    throw error
  }
}

export function generateUploadKey(userId: string, scanId: string, filename: string): string {
  return `scans/${userId}/${scanId}/${filename}`
}