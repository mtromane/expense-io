import { expect, test } from '@playwright/test'
import { SEED } from '../support/actors'
import { loginUI } from '../support/ui'

test.describe('E2E-02 — connexion et navigation par rôle', { tag: '@parity' }, () => {
  const cases = [
    { role: 'employé', creds: SEED.employee, manager: 0, hr: 0 },
    { role: 'manager', creds: SEED.manager, manager: 1, hr: 0 },
    { role: 'RH', creds: SEED.hr, manager: 0, hr: 1 },
  ]
  for (const { role, creds, manager, hr } of cases) {
    test(`${role} : liens de navigation attendus`, async ({ page }) => {
      await loginUI(page, creds)
      await expect(page.getByRole('link', { name: 'Manager', exact: true })).toHaveCount(manager)
      await expect(page.getByRole('link', { name: 'RH', exact: true })).toHaveCount(hr)
    })
  }

  test('déconnexion → /login', async ({ page }) => {
    await loginUI(page, SEED.employee)
    await page.getByRole('button', { name: 'Se déconnecter' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('mauvais mot de passe → message d’erreur', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(SEED.employee.email)
    await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Email ou mot de passe incorrect.' })).toBeVisible()
  })
})
