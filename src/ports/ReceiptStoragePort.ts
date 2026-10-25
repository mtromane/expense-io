/** Stockage objet des reçus (S3 en production, LocalStack en local). */
export interface ReceiptStoragePort {
  upload(key: string, body: Buffer, contentType: string): Promise<void>
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>
  /** Supprime un reçu ; sert à compenser une création de note qui échoue. */
  delete(key: string): Promise<void>
}
