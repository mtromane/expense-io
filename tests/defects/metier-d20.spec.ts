import { expect, test } from '@playwright/test'
import { actor, E2E_PASSWORD } from '../support/actors'
import { apiLogin, credentialsOf, loginAs } from '../support/auth'
import { apiError } from '../support/messages'
import { createNote, postNote, uniqueDescription } from '../support/notes'
import { loginUI, signupUI, uniqueDomain } from '../support/ui'
import { expectDefect } from './registry'

/**
 * Défauts métier sans arbitrage, tranchés par la décision D20 du 2026-10-29
 * (docs/audit/21-decisions-architecture.md, ADR-020) : leur cible fait
 * consensus dans docs/audit/22-comportements-a-corriger.md.
 *
 * expectDefect() est appelé après la mise en place : un échec de setup reste un
 * vrai échec. Aucun test ne modifie l'organigramme : ils tournent en parallèle.
 */

/** Date `YYYY-MM-DD` décalée de `days` jours par rapport à aujourd'hui (UTC). */
function utcDatePlus(days: number): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days)).toISOString().slice(0, 10)
}

test('MET-05 connexion avec l’email en majuscules → acceptée, la casse est ignorée',
  { tag: ['@defect', '@MET-05'] }, async () => {
    const empB = actor('empB')
    expectDefect('MET-05')
    const ctx = await apiLogin({ email: empB.email.toUpperCase(), password: E2E_PASSWORD })
    expect((await ctx.get('/api/expense-notes')).status()).toBe(200)
    await ctx.dispose()
  })

test('MET-05 inscription d’un email déjà inscrit, dans une autre casse → refusée',
  { tag: ['@defect', '@MET-05'] }, async ({ browser }) => {
    const domain = uniqueDomain()
    const first = await browser.newContext()
    const firstPage = await first.newPage()
    await signupUI(firstPage, { name: 'Casse', email: `casse@${domain}`, password: 'motdepasse1' })
    await expect(firstPage).toHaveURL(/\/expenses$/) // inscription terminée avant la suivante
    await first.close()

    const second = await browser.newContext()
    const page = await second.newPage()
    expectDefect('MET-05')
    await signupUI(page, { name: 'Casse bis', email: `Casse@${domain.toUpperCase()}`, password: 'motdepasse1' })
    await expect(page.getByRole('alert').filter({ hasText: 'Un compte existe déjà avec cet email.' })).toBeVisible()
    await expect(page).toHaveURL(/\/signup$/)
    await second.close()
  })

test('MET-06 date de dépense après demain (UTC) → 400 Invalid fields ; la date du jour reste acceptée',
  { tag: ['@defect', '@MET-06'] }, async () => {
    const emp = await loginAs('empB')
    expectDefect('MET-06')
    for (const expenseDate of [utcDatePlus(3), '2999-12-31']) {
      const res = await postNote(emp, { expenseDate })
      expect(res.status(), expenseDate).toBe(400)
      expect(await res.json()).toEqual(apiError('Champs invalides'))
    }
    expect((await postNote(emp, { expenseDate: utcDatePlus(0) })).status()).toBe(201)
    await emp.dispose()
  })

test('MET-08 liste du manager : chaque note porte le nom de son auteur',
  { tag: ['@defect', '@MET-08'] }, async () => {
    const [emp, mgr] = await Promise.all([loginAs('empA1'), loginAs('subMgrA')])
    const note = await createNote(emp, { description: uniqueDescription('MET-08') })
    expectDefect('MET-08')
    const res = await mgr.get('/api/manager/expense-notes')
    expect(res.status()).toBe(200)
    const listed = ((await res.json()) as { id: string; authorName?: string }[]).find((n) => n.id === note.id)
    expect(listed?.authorName).toBe(actor('empA1').name)
    await Promise.all([emp.dispose(), mgr.dispose()])
  })

test('MET-08 page de validation : le manager voit le nom de l’auteur, pas son identifiant',
  { tag: ['@defect', '@MET-08'] }, async ({ page }) => {
    const emp = await loginAs('empA1')
    const description = uniqueDescription('MET-08 UI')
    await createNote(emp, { description })
    await emp.dispose()

    await loginUI(page, credentialsOf(actor('subMgrA')))
    await page.goto('/manager')
    const row = page.getByRole('row').filter({ hasText: description })
    await expect(row).toBeVisible()
    expectDefect('MET-08')
    await expect(row.getByRole('cell').first()).toHaveText(actor('empA1').name)
  })
