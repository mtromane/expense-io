import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { apiLogin, type Credentials } from '../support/auth'
import { receipt, type ReceiptFile } from '../support/files'
import { createNote, uniqueDescription } from '../support/notes'
import { signupUI, uniqueDomain } from '../support/ui'

const EURO = '[\\u00a0\\u202f]€'

function ocrFile(file: string): ReceiptFile {
  return { name: file, mimeType: 'image/png', buffer: readFileSync(path.join(process.cwd(), 'tests/fixtures/ocr', file)) }
}

/** Compte neuf : liste vide, totaux prévisibles. */
async function freshUser(page: Page): Promise<Credentials> {
  const creds = { email: `ui@${uniqueDomain()}`, password: 'motdepasse1' }
  await signupUI(page, { name: 'Utilisateur UI', ...creds })
  await expect(page).toHaveURL(/\/expenses$/)
  return creds
}

async function fillNote(page: Page, input: { amount: string; date: string; description: string; file: ReceiptFile }) {
  await page.getByLabel('Montant (€)').fill(input.amount)
  await page.getByLabel('Date').fill(input.date)
  await page.getByLabel('Description').fill(input.description)
  await page.getByLabel('Reçu (image ou PDF)').setInputFiles(input.file)
}

test.describe('E2E-10 — page « Mes notes de frais »', { tag: '@parity' }, () => {
  test('plusieurs notes : compteur au pluriel, total, milliers, plus récente en premier', async ({ page }) => {
    const creds = await freshUser(page)
    const api = await apiLogin(creds)
    const descriptions: string[] = []
    for (const amount of ['10.00', '20.50', '1234.25']) {
      descriptions.push(uniqueDescription(`Total ${amount}`))
      await createNote(api, { amount, description: descriptions.at(-1) })
    }
    await api.dispose()

    await page.reload()
    await expect(page.getByText(new RegExp(`3 notes · 1[\\u00a0\\u202f ]264,75${EURO} au total`))).toBeVisible()
    const rows = page.getByRole('row')
    await expect(rows).toHaveCount(4) // en-tête + 3 notes
    await expect(rows.nth(1)).toContainText(descriptions[2])
    await expect(rows.nth(1)).toContainText(new RegExp(`1[\\u00a0\\u202f ]234,25${EURO}`))
    await expect(rows.nth(3)).toContainText(descriptions[0])
  })

  test('soumission réussie : la note apparaît et le formulaire est vidé', async ({ page }) => {
    await freshUser(page)
    const description = uniqueDescription('Formulaire')
    await fillNote(page, { amount: '12.30', date: '2026-05-04', description, file: receipt('jpg') })
    await page.getByRole('button', { name: 'Soumettre' }).click()

    const row = page.getByRole('row').filter({ hasText: description })
    await expect(row).toContainText('4 mai 2026')
    await expect(row).toContainText(new RegExp(`12,30${EURO}`))
    await expect(page.getByLabel('Montant (€)')).toHaveValue('')
    await expect(page.getByLabel('Date')).toHaveValue('')
    await expect(page.getByLabel('Description')).toHaveValue('')
    await expect(page.getByLabel('Reçu (image ou PDF)')).toHaveValue('')
  })

  test('refus du serveur : message affiché, saisie conservée, aucune note ajoutée', async ({ page }) => {
    await freshUser(page)
    const description = uniqueDescription('Gif refusé')
    await fillNote(page, { amount: '9.99', date: '2026-05-04', description, file: receipt('gif') })
    await page.getByRole('button', { name: 'Soumettre' }).click()

    await expect(page.getByRole('alert').filter({ hasText: 'Type de fichier non autorisé pour le reçu' })).toBeVisible()
    await expect(page.getByLabel('Description')).toHaveValue(description)
    await expect(page.getByRole('button', { name: 'Soumettre' })).toBeEnabled()
    await expect(page.getByText('Aucune note de frais pour le moment.')).toBeVisible()
  })

  test('description affichée comme texte, jamais interprétée comme du HTML', async ({ page }) => {
    const creds = await freshUser(page)
    const description = `<img src=x onerror="window.__xss=1"><b>gras</b> ${uniqueDescription('XSS')}`
    const api = await apiLogin(creds)
    await createNote(api, { description })
    await api.dispose()

    await page.reload()
    await expect(page.getByRole('row').filter({ hasText: description })).toBeVisible()
    await expect(page.locator('main img, main b')).toHaveCount(0)
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
  })
})

test.describe('E2E-10 — pré-remplissage depuis le reçu (cas complémentaires)', { tag: '@parity' }, () => {
  test('reçu avec montant seul → montant rempli, date signalée', async ({ page }) => {
    test.setTimeout(60_000)
    await freshUser(page)
    await page.getByLabel('Reçu (image ou PDF)').setInputFiles(ocrFile('ticket-montant-seul.png'))
    await page.getByRole('button', { name: 'Pré-remplir depuis le reçu' }).click()
    await expect(page.getByText('Date non reconnu(e) sur ce reçu — vérifie ce champ.')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByLabel('Montant (€)')).toHaveValue('15')
    await expect(page.getByLabel('Date')).toHaveValue('')
  })

  test('reçu avec date seule → date remplie, montant signalé', async ({ page }) => {
    test.setTimeout(60_000)
    await freshUser(page)
    await page.getByLabel('Reçu (image ou PDF)').setInputFiles(ocrFile('ticket-date-seule.png'))
    await page.getByRole('button', { name: 'Pré-remplir depuis le reçu' }).click()
    await expect(page.getByText('Montant non reconnu(e) sur ce reçu — vérifie ce champ.')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByLabel('Date')).toHaveValue('2026-02-14')
    await expect(page.getByLabel('Montant (€)')).toHaveValue('')
  })

  test('reçu PDF → message de saisie manuelle', async ({ page }) => {
    await freshUser(page)
    await page.getByLabel('Reçu (image ou PDF)').setInputFiles(receipt('pdf'))
    await page.getByRole('button', { name: 'Pré-remplir depuis le reçu' }).click()
    await expect(
      page.getByText('Aucune information reconnue sur ce reçu — saisis les champs manuellement.')
    ).toBeVisible({ timeout: 30_000 })
  })

  test('pré-remplir puis soumettre : la note reprend les valeurs reconnues', async ({ page }) => {
    test.setTimeout(60_000)
    await freshUser(page)
    await page.getByLabel('Reçu (image ou PDF)').setInputFiles(ocrFile('ticket-total.png'))
    await page.getByRole('button', { name: 'Pré-remplir depuis le reçu' }).click()
    await expect(page.getByLabel('Montant (€)')).toHaveValue('42.5', { timeout: 30_000 })

    const description = uniqueDescription('Depuis OCR')
    await page.getByLabel('Description').fill(description)
    await page.getByRole('button', { name: 'Soumettre' }).click()
    const row = page.getByRole('row').filter({ hasText: description })
    await expect(row).toContainText('12 mars 2026')
    await expect(row).toContainText(new RegExp(`42,50${EURO}`))
    await expect(row).toContainText('en attente')
  })
})
