import { expect, test, type Page } from '@playwright/test'
import { uniqueDomain } from '../support/ui'

// Validation côté serveur de l'inscription : le formulaire bloque déjà la
// plupart des saisies invalides, mais le serveur doit les refuser aussi
// (requête forgée, navigateur sans validation HTML).

const MESSAGE = 'Nom requis, email invalide, ou mot de passe trop court (8 caractères minimum).'

async function submitSignup(page: Page, input: { name: string; email: string; password: string }, bypassBrowserChecks = false) {
  await page.goto('/signup')
  if (bypassBrowserChecks) {
    await page.locator('form').evaluate((form) => form.setAttribute('novalidate', ''))
  }
  await page.getByLabel('Nom').fill(input.name)
  await page.getByLabel('Email').fill(input.email)
  await page.getByLabel('Mot de passe').fill(input.password)
  await page.getByRole('button', { name: "S'inscrire" }).click()
}

test.describe('E2E-01 — inscription : validation côté serveur', { tag: '@parity' }, () => {
  test('nom composé uniquement d’espaces → message, reste sur /signup', async ({ page }) => {
    await submitSignup(page, { name: '   ', email: `blanc@${uniqueDomain()}`, password: 'motdepasse1' })
    await expect(page.getByRole('alert').filter({ hasText: MESSAGE })).toBeVisible()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('domaine sans point (accepté par le navigateur) → message', async ({ page }) => {
    await submitSignup(page, { name: 'Sans point', email: 'sans-point@domaine', password: 'motdepasse1' })
    await expect(page.getByRole('alert').filter({ hasText: MESSAGE })).toBeVisible()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('validation du navigateur contournée : mot de passe de 7 caractères → message', async ({ page }) => {
    await submitSignup(page, { name: 'Court', email: `court@${uniqueDomain()}`, password: '1234567' }, true)
    await expect(page.getByRole('alert').filter({ hasText: MESSAGE })).toBeVisible()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('validation du navigateur contournée : email sans arobase → message', async ({ page }) => {
    await submitSignup(page, { name: 'Invalide', email: 'pas-un-email', password: 'motdepasse1' }, true)
    await expect(page.getByRole('alert').filter({ hasText: MESSAGE })).toBeVisible()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('mot de passe de 8 caractères pile accepté', async ({ page }) => {
    await submitSignup(page, { name: 'Pile', email: `pile@${uniqueDomain()}`, password: '12345678' })
    await expect(page).toHaveURL(/\/expenses$/)
  })
})
