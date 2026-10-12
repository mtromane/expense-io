import { expect, test } from '@playwright/test'
import { receipt } from '../support/files'
import { uniqueDescription } from '../support/notes'
import { signupUI, uniqueDomain } from '../support/ui'

test('E2E-03 — l’employé soumet une note et la voit dans l’historique', { tag: '@parity' }, async ({ page }) => {
  await signupUI(page, { name: 'Soumetteur', email: `soumetteur@${uniqueDomain()}`, password: 'motdepasse1' })
  await expect(page).toHaveURL(/\/expenses$/)

  const description = uniqueDescription('Taxi')
  await page.getByLabel('Montant (€)').fill('42.50')
  await page.getByLabel('Date').fill('2026-03-12')
  await page.getByLabel('Description').fill(description)
  await page.getByLabel('Reçu (image ou PDF)').setInputFiles(receipt('png'))
  await page.getByRole('button', { name: 'Soumettre' }).click()

  const row = page.getByRole('row').filter({ hasText: description })
  await expect(row).toBeVisible()
  await expect(row).toContainText('en attente')
  await expect(row).toContainText('12 mars 2026')
  await expect(row).toContainText(/42,50[\u00a0\u202f]€/) // espace insécable (Intl fr-FR)
  await expect(page.getByText(/1 note · 42,50[\u00a0\u202f]€ au total/)).toBeVisible()
})
