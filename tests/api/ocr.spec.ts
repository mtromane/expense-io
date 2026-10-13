import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type APIRequestContext } from '@playwright/test'
import { loginAs } from '../support/auth'
import { receipt, type ReceiptFile } from '../support/files'

// Tests de référence de la suggestion OCR : sur des reçus fixes, la sortie
// `{amount, expenseDate}` doit rester exactement celle de l'application
// d'origine. Les références sont enregistrées sur la baseline :
//   OCR_RECORD=1 npx playwright test tests/api/ocr.spec.ts --no-deps
// (à ne relancer que si un changement de sortie est voulu et validé).

const OCR_DIR = path.join(process.cwd(), 'tests/fixtures/ocr')
const EXPECTED_DIR = path.join(OCR_DIR, 'expected')

const FIXTURES: { file: string; mimeType: string }[] = [
  { file: 'ticket-total.png', mimeType: 'image/png' },
  { file: 'ticket-total.jpg', mimeType: 'image/jpeg' },
  { file: 'ticket-date-texte.png', mimeType: 'image/png' },
  { file: 'ticket-iso.png', mimeType: 'image/png' },
  { file: 'ticket-vide.png', mimeType: 'image/png' },
]

function ocrReceipt(file: string, mimeType: string): ReceiptFile {
  return { name: file, mimeType, buffer: readFileSync(path.join(OCR_DIR, file)) }
}

test.describe('OCR — suggestion depuis le reçu', { tag: '@parity' }, () => {
  let emp: APIRequestContext
  test.beforeAll(async () => {
    emp = await loginAs('empA1')
  })
  test.afterAll(async () => {
    await emp.dispose()
  })

  for (const { file, mimeType } of FIXTURES) {
    test(`${file} → sortie identique à la référence`, async () => {
      test.setTimeout(60_000)
      const res = await emp.post('/api/expense-notes/receipt-suggestion', {
        multipart: { receipt: ocrReceipt(file, mimeType) },
      })
      expect(res.status()).toBe(200)
      const suggestion = await res.json()
      const expectedFile = path.join(EXPECTED_DIR, `${file}.json`)
      if (process.env.OCR_RECORD === '1') {
        mkdirSync(EXPECTED_DIR, { recursive: true })
        writeFileSync(expectedFile, JSON.stringify(suggestion, null, 2) + '\n')
        return
      }
      expect(suggestion).toEqual(JSON.parse(readFileSync(expectedFile, 'utf8')))
    })
  }

  test('reçu PDF → aucune suggestion', async () => {
    const res = await emp.post('/api/expense-notes/receipt-suggestion', { multipart: { receipt: receipt('pdf') } })
    expect(res.status()).toBe(200)
    expect(await res.json()).toEqual({})
  })

  test('champ reçu qui n’est pas un fichier → 400 Champs invalides', async () => {
    const res = await emp.post('/api/expense-notes/receipt-suggestion', { multipart: { receipt: 'pas un fichier' } })
    expect(res.status()).toBe(400)
    expect(await res.json()).toEqual({ error: 'Champs invalides' })
  })
})
