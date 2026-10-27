import { deleteReceipt, getReceiptUrl, uploadReceipt } from '@/modules/shared/infrastructure/s3ReceiptStorage'
import type { ReceiptStoragePort } from '@/ports/ReceiptStoragePort'

export class S3ReceiptAdapter implements ReceiptStoragePort {
  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await uploadReceipt(key, body, contentType)
  }

  async getSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    return getReceiptUrl(key, expiresInSeconds)
  }

  async delete(key: string): Promise<void> {
    await deleteReceipt(key)
  }
}
