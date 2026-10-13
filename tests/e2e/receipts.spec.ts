import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { actor } from '../support/actors'
import { credentialsOf, loginAs } from '../support/auth'
import { receipt } from '../support/files'
import { createNote, uniqueDescription } from '../support/notes'
import { loginUI, signupUI, uniqueDomain } from '../support/ui'

const ocrFile = (file: string) => ({
  name: file,
  mimeType: 'image/png',
  buffer: readFileSync(path.join(process.cwd(), 'tests/fixtures/ocr', file)),
})

test.describe('E2E-07 — pré-remplissage depuis le reçu (OCR)', { tag: '@parity' }, () => {
  test.beforeEach(async ({ page }) => {
    await signupUI(page, { name: 'Ocr', email: `ocr@${uniqueDomain()}`, password: 'motdepasse1' })
    await expect(page).toHaveURL(/\/expenses$/)
  })

  test('reçu lisible → montant et date remplis', async ({ page }) => {
    test.setTimeout(60_000)
    await page.getByLabel('Reçu (image ou PDF)').setInputFiles(ocrFile('ticket-total.png'))
    await page.getByRole('button', { name: 'Pré-remplir depuis le reçu' }).click()
    await expect(page.getByLabel('Montant (€)')).toHaveValue('42.5', { timeout: 30_000 })
    await expect(page.getByLabel('Date')).toHaveValue('2026-03-12')
  })

  test('reçu sans information → message de saisie manuelle', async ({ page }) => {
    test.setTimeout(60_000)
    await page.getByLabel('Reçu (image ou PDF)').setInputFiles(ocrFile('ticket-vide.png'))
    await page.getByRole('button', { name: 'Pré-remplir depuis le reçu' }).click()
    await expect(
      page.getByText('Aucune information reconnue sur ce reçu — saisis les champs manuellement.')
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByLabel('Montant (€)')).toHaveValue('')
  })

  test('sans reçu sélectionné → message d’erreur', async ({ page }) => {
    await page.getByRole('button', { name: 'Pré-remplir depuis le reçu' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Sélectionne d’abord un reçu.' })).toBeVisible()
  })
})

test('E2E-06 — « Voir le reçu » ouvre l’image du reçu', { tag: '@parity' }, async ({ page, context }) => {
  const description = uniqueDescription('Voir reçu')
  const emp = await loginAs('empA1')
  await createNote(emp, { description, receipt: receipt('png') })
  await emp.dispose()

  await loginUI(page, credentialsOf(actor('empA1')))
  const popupPromise = context.waitForEvent('page')
  await page.getByRole('row').filter({ hasText: description }).getByRole('button', { name: 'Voir le reçu' }).click()
  const popup = await popupPromise
  await popup.waitForLoadState()
  expect(popup.url()).toContain('receipts')
  const width = await popup.evaluate(() => document.querySelector('img')?.naturalWidth ?? 0)
  expect(width).toBeGreaterThan(0)
})
