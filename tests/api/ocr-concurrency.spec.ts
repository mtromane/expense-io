import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type APIRequestContext } from '@playwright/test'
import { loginAs } from '../support/auth'
import type { ReceiptFile } from '../support/files'

// Garde-fou de PERF-01 (worker Tesseract réutilisé au lieu d'un par requête) :
// un worker ou un cache partagé ne doit jamais mélanger les résultats de deux
// requêtes, simultanées ou successives. Références : tests/fixtures/ocr/expected/.

const OCR_DIR = path.join(process.cwd(), 'tests/fixtures/ocr')

const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' }

function ocrReceipt(file: string, name = file): ReceiptFile {
  return { name, mimeType: MIME[path.extname(file)], buffer: readFileSync(path.join(OCR_DIR, file)) }
}

function reference(file: string): unknown {
  return JSON.parse(readFileSync(path.join(OCR_DIR, 'expected', `${file}.json`), 'utf8'))
}

async function suggest(ctx: APIRequestContext, receipt: ReceiptFile): Promise<unknown> {
  const res = await ctx.post('/api/expense-notes/receipt-suggestion', { multipart: { receipt } })
  expect(res.status(), receipt.name).toBe(200)
  return res.json()
}

test.describe('OCR — requêtes simultanées et successives', { tag: '@parity' }, () => {
  let empA1: APIRequestContext, empA2: APIRequestContext
  test.beforeAll(async () => {
    ;[empA1, empA2] = await Promise.all([loginAs('empA1'), loginAs('empA2')])
  })
  test.afterAll(async () => {
    await Promise.all([empA1.dispose(), empA2.dispose()])
  })

  test('reçus différents envoyés en même temps par deux utilisateurs → chacun sa référence', async () => {
    test.setTimeout(180_000)
    const batch = [
      { ctx: empA1, file: 'ticket-total.png' },
      { ctx: empA2, file: 'ticket-montant-seul.png' },
      { ctx: empA1, file: 'ticket-date-seule.png' },
      { ctx: empA2, file: 'ticket-vide.png' },
      { ctx: empA1, file: 'ticket-milliers.png' },
      { ctx: empA2, file: 'ticket-total.png' },
    ]
    const results = await Promise.all(batch.map(({ ctx, file }) => suggest(ctx, ocrReceipt(file))))
    batch.forEach(({ file }, i) => expect(results[i], file).toEqual(reference(file)))
  })

  test('reçus enchaînés sur une même session → aucun résultat ne déteint sur le suivant', async () => {
    test.setTimeout(180_000)
    const sequence = ['ticket-total.png', 'ticket-vide.png', 'ticket-montant-seul.png', 'ticket-date-seule.png', 'ticket-total.png']
    for (const file of sequence) {
      expect(await suggest(empA1, ocrReceipt(file)), file).toEqual(reference(file))
    }
  })

  test('même nom de fichier, contenus différents → résultats différents (pas de cache par nom)', async () => {
    test.setTimeout(120_000)
    expect(await suggest(empA1, ocrReceipt('ticket-total.png', 'recu.png'))).toEqual(reference('ticket-total.png'))
    expect(await suggest(empA1, ocrReceipt('ticket-vide.png', 'recu.png'))).toEqual(reference('ticket-vide.png'))
  })
})
