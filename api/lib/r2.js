import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let client

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  )
}

function getClient() {
  if (!isR2Configured()) throw new Error('Missing R2 configuration')
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    })
  }
  return client
}

export async function uploadR2Pdf(key, body) {
  return getClient().send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: 'application/pdf',
    CacheControl: 'private, max-age=3600',
  }))
}

export async function headR2Pdf(key) {
  return getClient().send(new HeadObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  }))
}

export async function deleteR2Pdf(key) {
  return getClient().send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  }))
}

export async function getR2PdfUrl(key, expiresIn = 3600) {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }),
    { expiresIn }
  )
}

export async function listR2Pdfs() {
  const objects = []
  let continuationToken

  do {
    const page = await getClient().send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      ContinuationToken: continuationToken,
    }))
    objects.push(...(page.Contents ?? []))
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (continuationToken)

  return objects
}
