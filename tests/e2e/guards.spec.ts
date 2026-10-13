import { expect, test } from '@playwright/test'
import { SEED } from '../support/actors'
import { loginUI } from '../support/ui'

test.describe('E2E-08 — gardes d’accès', { tag: '@parity' }, () => {
  for (const path of ['/expenses', '/manager', '/hr']) {
    test(`anonyme sur ${path} → /login`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login$/)
    })
  }

  test('employé sur /hr → « Accès réservé aux RH »', async ({ page }) => {
    await loginUI(page, SEED.employee)
    await page.goto('/hr')
    await expect(page.getByRole('heading', { name: 'Accès réservé aux RH' })).toBeVisible()
  })

  test('employé sur /manager → « Accès réservé aux managers »', async ({ page }) => {
    await loginUI(page, SEED.employee)
    await page.goto('/manager')
    await expect(page.getByRole('heading', { name: 'Accès réservé aux managers' })).toBeVisible()
  })

  test('connecté sur / → /expenses', async ({ page }) => {
    await loginUI(page, SEED.employee)
    await page.goto('/')
    await expect(page).toHaveURL(/\/expenses$/)
  })
})
