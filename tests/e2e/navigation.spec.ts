import { expect, test } from '@playwright/test'
import { SEED } from '../support/actors'
import { loginUI } from '../support/ui'

test.describe('E2E-09 — navigation et session', { tag: '@parity' }, () => {
  test('accueil anonyme : présentation et liens de connexion / inscription', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Expense.io' })).toBeVisible()
    await expect(page.getByText('Gestion de notes de frais.')).toBeVisible()
    await page.getByRole('link', { name: 'Se connecter' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()

    await page.goto('/')
    await page.getByRole('link', { name: 'Créer un compte' }).click()
    await expect(page).toHaveURL(/\/signup$/)
    await expect(page.getByRole('heading', { name: 'Créer un compte' })).toBeVisible()
  })

  test('connexion ↔ inscription par les liens des formulaires', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: 'Créer un compte' }).click()
    await expect(page).toHaveURL(/\/signup$/)
    await page.getByRole('link', { name: 'Se connecter' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('la session survit au rechargement de la page', async ({ page }) => {
    await loginUI(page, SEED.employee)
    await page.reload()
    await expect(page).toHaveURL(/\/expenses$/)
    await expect(page.getByRole('heading', { name: 'Mes notes de frais' })).toBeVisible()
    await expect(page.getByText(SEED.employee.email)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible()
  })

  test('après déconnexion, les pages protégées renvoient vers /login', async ({ page }) => {
    await loginUI(page, SEED.manager)
    // Préchargements (RSC) des liens terminés avant la déconnexion : une
    // réponse de préchargement reçue APRÈS la déconnexion réémet le cookie de
    // session (le proxy auth() le renouvelle à chaque requête) et reconnecte
    // l'utilisateur. Course réelle de l'application d'origine, signalée à
    // l'audit ; ce test vérifie la déconnexion hors de cette course.
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Se déconnecter' }).click()
    await expect(page).toHaveURL(/\/login$/)
    for (const path of ['/expenses', '/manager', '/hr']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login$/)
    }
    await expect(page.getByRole('button', { name: 'Se déconnecter' })).toHaveCount(0)
  })

  test('manager : lien « Manager » → page de validation, lien marqué actif ; logo → /expenses', async ({ page }) => {
    await loginUI(page, SEED.manager)
    const link = page.getByRole('link', { name: 'Manager', exact: true })
    await expect(link).not.toHaveAttribute('aria-current', 'page')
    await link.click()
    await expect(page).toHaveURL(/\/manager$/)
    await expect(page.getByRole('heading', { name: 'Validation des notes de frais' })).toBeVisible()
    await expect(link).toHaveAttribute('aria-current', 'page')

    await page.getByRole('link', { name: /Expense\.io/ }).click()
    await expect(page).toHaveURL(/\/expenses$/)
  })

  test('RH : lien « RH » → espace RH, lien marqué actif', async ({ page }) => {
    await loginUI(page, SEED.hr)
    const link = page.getByRole('link', { name: 'RH', exact: true })
    await link.click()
    await expect(page).toHaveURL(/\/hr$/)
    await expect(page.getByRole('heading', { name: 'Espace RH' })).toBeVisible()
    await expect(link).toHaveAttribute('aria-current', 'page')
  })

  test('manager sur /hr → « Accès réservé aux RH »', async ({ page }) => {
    await loginUI(page, SEED.manager)
    await page.goto('/hr')
    await expect(page.getByRole('heading', { name: 'Accès réservé aux RH' })).toBeVisible()
  })

  test('RH sur /manager → « Accès réservé aux managers »', async ({ page }) => {
    await loginUI(page, SEED.hr)
    await page.goto('/manager')
    await expect(page.getByRole('heading', { name: 'Accès réservé aux managers' })).toBeVisible()
  })
})
