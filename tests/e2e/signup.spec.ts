import { expect, test } from '@playwright/test'
import { signupUI, uniqueDomain } from '../support/ui'

test.describe('E2E-01 — inscription', { tag: '@parity' }, () => {
  test('premier inscrit d’un domaine → RH, /expenses vide', async ({ page }) => {
    const email = `fondateur@${uniqueDomain()}`
    await signupUI(page, { name: 'Fondateur', email, password: 'motdepasse1' })
    await expect(page).toHaveURL(/\/expenses$/)
    await expect(page.getByText('Soumets ta première note de frais ci-dessous.')).toBeVisible()
    await expect(page.getByText('Aucune note de frais pour le moment.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'RH', exact: true })).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()
  })

  test('second inscrit du même domaine → employé, sans lien RH', async ({ browser }) => {
    const domain = uniqueDomain()
    const first = await browser.newContext()
    const firstPage = await first.newPage()
    await signupUI(firstPage, { name: 'Premier', email: `premier@${domain}`, password: 'motdepasse1' })
    await expect(firstPage).toHaveURL(/\/expenses$/) // inscription terminée avant la suivante
    await first.close()

    const second = await browser.newContext()
    const page = await second.newPage()
    await signupUI(page, { name: 'Second', email: `second@${domain}`, password: 'motdepasse1' })
    await expect(page).toHaveURL(/\/expenses$/)
    await expect(page.getByRole('link', { name: 'RH', exact: true })).toHaveCount(0)
    await second.close()
  })

  test('email déjà utilisé → message d’erreur', async ({ browser }) => {
    const email = `doublon@${uniqueDomain()}`
    const first = await browser.newContext()
    const firstPage = await first.newPage()
    await signupUI(firstPage, { name: 'A', email, password: 'motdepasse1' })
    await expect(firstPage).toHaveURL(/\/expenses$/) // inscription terminée avant la suivante
    await first.close()

    const second = await browser.newContext()
    const page = await second.newPage()
    await signupUI(page, { name: 'B', email, password: 'motdepasse1' })
    await expect(page.getByRole('alert').filter({ hasText: 'Un compte existe déjà avec cet email.' })).toBeVisible()
    await second.close()
  })

  test('mot de passe de moins de 8 caractères : reste sur /signup', async ({ page }) => {
    await signupUI(page, { name: 'Court', email: `court@${uniqueDomain()}`, password: '1234567' })
    await expect(page).toHaveURL(/\/signup$/)
  })
})
