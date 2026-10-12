import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Stockage des reçus (src/lib/storage.ts) : URL présignée (durée de vie
 * courte), variables d'environnement de .env.example réellement prises en
 * compte, client S3 réutilisé. Signature calculée localement : aucun appel
 * réseau. Le format de la clé (`receiptKeyFor`) n'est pas figé ici : SEC-06
 * doit le changer.
 */

async function loadStorage(env: Record<string, string> = {}) {
  vi.stubEnv('S3_ENDPOINT', 'http://localhost:4567')
  vi.stubEnv('S3_REGION', 'us-east-1')
  vi.stubEnv('S3_ACCESS_KEY_ID', 'test-key')
  vi.stubEnv('S3_SECRET_ACCESS_KEY', 'test-secret')
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value)
  vi.resetModules()
  const storage = await import('@/lib/storage')
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
  return { storage, S3Client, PutObjectCommand }
}

beforeEach(() => {
  vi.unstubAllEnvs()
  // Valeurs par défaut du code : aucune variable optionnelle héritée du poste.
  vi.stubEnv('S3_BUCKET', undefined)
  vi.stubEnv('S3_FORCE_PATH_STYLE', undefined)
})

describe('URL de reçu présignée', () => {
  it('pointe vers le bucket et la clé, en style chemin, valable 5 minutes par défaut', async () => {
    const { storage } = await loadStorage()
    const url = new URL(await storage.getReceiptUrl('receipts/abc.png'))
    expect(url.origin).toBe('http://localhost:4567')
    expect(url.pathname).toBe('/receipts/receipts/abc.png')
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300')
    expect(url.searchParams.get('X-Amz-Credential')).toMatch(/^test-key\//)
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('durée de validité paramétrable', async () => {
    const { storage } = await loadStorage()
    const url = new URL(await storage.getReceiptUrl('receipts/abc.png', 60))
    expect(url.searchParams.get('X-Amz-Expires')).toBe('60')
  })

  it('S3_BUCKET pris en compte', async () => {
    const { storage } = await loadStorage({ S3_BUCKET: 'autre-bucket' })
    const url = new URL(await storage.getReceiptUrl('receipts/abc.png'))
    expect(url.pathname).toBe('/autre-bucket/receipts/abc.png')
  })

  it('S3_FORCE_PATH_STYLE=false → bucket dans le nom d’hôte', async () => {
    const { storage } = await loadStorage({ S3_FORCE_PATH_STYLE: 'false' })
    const url = new URL(await storage.getReceiptUrl('receipts/abc.png'))
    expect(url.hostname).toBe('receipts.localhost')
    expect(url.pathname).toBe('/receipts/abc.png')
  })

  it('S3_FORCE_PATH_STYLE=true → style chemin', async () => {
    const { storage } = await loadStorage({ S3_FORCE_PATH_STYLE: 'true' })
    const url = new URL(await storage.getReceiptUrl('receipts/abc.png'))
    expect(url.pathname).toBe('/receipts/receipts/abc.png')
  })
})

describe('Téléversement d’un reçu', () => {
  it('envoie le contenu et le type MIME dans le bucket configuré', async () => {
    const { storage, S3Client, PutObjectCommand } = await loadStorage()
    const send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never)
    const body = Buffer.from('contenu du reçu')
    await storage.uploadReceipt('receipts/abc.png', body, 'image/png')
    expect(send).toHaveBeenCalledTimes(1)
    const command = send.mock.calls[0][0]
    expect(command).toBeInstanceOf(PutObjectCommand)
    expect(command.input).toEqual({ Bucket: 'receipts', Key: 'receipts/abc.png', Body: body, ContentType: 'image/png' })
  })

  it('le client S3 est créé une fois puis réutilisé', async () => {
    const { storage, S3Client } = await loadStorage()
    const send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never)
    await storage.uploadReceipt('receipts/a.png', Buffer.from('a'), 'image/png')
    await storage.uploadReceipt('receipts/b.png', Buffer.from('b'), 'image/png')
    expect(send.mock.contexts[0]).toBe(send.mock.contexts[1])
  })

  it('une erreur S3 est propagée (jamais avalée)', async () => {
    const { storage, S3Client } = await loadStorage()
    vi.spyOn(S3Client.prototype, 'send').mockRejectedValue(new Error('S3 indisponible') as never)
    await expect(storage.uploadReceipt('receipts/a.png', Buffer.from('a'), 'image/png')).rejects.toThrow('S3 indisponible')
  })
})
