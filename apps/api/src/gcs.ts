import { generateKeyPairSync } from 'node:crypto'

import { Storage } from '@google-cloud/storage'

const bucketName = process.env.GCS_BUCKET_NAME

if (!bucketName) {
  throw new Error('GCS_BUCKET_NAME is not set')
}

// ローカル開発ではfake-gcs-server等のエミュレータを指すために GCS_API_ENDPOINT を使用する。
// エミュレータは署名の正当性を検証しないため、署名に必要な鍵ペアはその場で生成すれば十分。
function createEmulatorCredentials() {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  })
  return { client_email: 'fake@example.com', private_key: privateKey }
}

const storage = new Storage(
  process.env.GCS_API_ENDPOINT
    ? {
        apiEndpoint: process.env.GCS_API_ENDPOINT,
        projectId: process.env.GOOGLE_CLOUD_PROJECT ?? 'honobun-dev',
        credentials: createEmulatorCredentials(),
      }
    : undefined,
)

const bucket = storage.bucket(bucketName)

const SIGNED_URL_EXPIRES_MS = 15 * 60 * 1000

export async function createUploadUrl(objectKey: string, contentType: string): Promise<string> {
  const [url] = await bucket.file(objectKey).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + SIGNED_URL_EXPIRES_MS,
    contentType,
  })
  return url
}

export async function createDownloadUrl(objectKey: string): Promise<string> {
  const [url] = await bucket.file(objectKey).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + SIGNED_URL_EXPIRES_MS,
  })
  return url
}
