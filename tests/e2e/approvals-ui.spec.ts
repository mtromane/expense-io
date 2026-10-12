import { expect, test, type Locator, type Page } from '@playwright/test'
import { actor } from '../support/actors'
import { credentialsOf, loginAs } from '../support/auth'
import { receipt } from '../support/files'
import { createNote, listOwnNotes, uniqueDescription } from '../support/notes'
import { loginUI, signupUI, uniqueDomain } from '../support/ui'

const AMOUNT_1234_50 = /1[   ]234,50[  ]€/

async function expectReceiptOpens(page: Page, row: Locator): Promise<void> {
  const popupPromise = page.context().waitForEvent('page')
  await row.getByRole('button', { name: 'Voir le reçu' }).click()
  const popup = await popupPromise
  await popup.waitForLoadState()
  expect(popup.url()).toContain('receipts')
  expect(await popup.evaluate(() => document.querySelector('img')?.naturalWidth ?? 0)).toBeGreaterThan(0)
  await popup.close()
}

test.describe('E2E-11 — page de validation manager', { tag: '@parity' }, () => {
  test('ligne : date, description et montant formatés ; compteur = nombre de lignes', async ({ page }) => {
    const emp = await loginAs('empA1')
    const description = uniqueDescription('Ligne manager')
    await createNote(emp, { amount: '1234.50', expenseDate: '2026-03-12', description })
    await emp.dispose()

    await loginUI(page, credentialsOf(actor('subMgrA')))
    await page.goto('/manager')
    const row = page.getByRole('row').filter({ hasText: description })
    await expect(row).toContainText('12 mars 2026')
    await expect(row).toContainText(AMOUNT_1234_50)
    const notes = (await page.getByRole('row').count()) - 1
    await expect(page.getByRole('heading', { name: `En attente (${notes})` })).toBeVisible()
  })

  test('« Voir le reçu » ouvre le reçu du rattaché', async ({ page }) => {
    const emp = await loginAs('empA1')
    const description = uniqueDescription('Reçu manager')
    await createNote(emp, { description, receipt: receipt('png') })
    await emp.dispose()

    await loginUI(page, credentialsOf(actor('subMgrA')))
    await page.goto('/manager')
    await expectReceiptOpens(page, page.getByRole('row').filter({ hasText: description }))
  })

  test('manager sans rattaché : liste vide', async ({ page }) => {
    await loginUI(page, credentialsOf(actor('loneMgrA')))
    await page.goto('/manager')
    await expect(page.getByRole('heading', { name: 'En attente (0)' })).toBeVisible()
    await expect(page.getByText('Aucune note en attente.')).toBeVisible()
  })

  test('note tranchée entre-temps : le message du serveur est affiché, la décision initiale reste', async ({ page }) => {
    const [emp, mgr] = await Promise.all([loginAs('empA1'), loginAs('subMgrA')])
    const description = uniqueDescription('Concurrence UI')
    const note = await createNote(emp, { description })

    await loginUI(page, credentialsOf(actor('subMgrA')))
    await page.goto('/manager')
    const row = page.getByRole('row').filter({ hasText: description })
    await expect(row).toBeVisible()
    expect((await mgr.post(`/api/manager/expense-notes/${note.id}/approve`)).status()).toBe(200)
    await row.getByRole('button', { name: 'Rejeter' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Already decided' })).toBeVisible()
    expect((await listOwnNotes(emp)).find((n) => n.id === note.id)?.status).toBe('approved')
    await Promise.all([emp.dispose(), mgr.dispose()])
  })
})

test.describe('E2E-11 — espace RH', { tag: '@parity' }, () => {
  test('ligne : nom du manager, date et montant formatés', async ({ page }) => {
    const root = await loginAs('rootMgrA')
    const description = uniqueDescription('Ligne RH')
    await createNote(root, { amount: '1234.50', expenseDate: '2026-03-12', description })
    await root.dispose()

    await loginUI(page, credentialsOf(actor('hrA')))
    await page.goto('/hr')
    const row = page.getByRole('row').filter({ hasText: description })
    await expect(row).toContainText('Root Manager A')
    await expect(row).toContainText('12 mars 2026')
    await expect(row).toContainText(AMOUNT_1234_50)
  })

  test('« Voir le reçu » ouvre le reçu du manager racine', async ({ page }) => {
    const root = await loginAs('rootMgrA')
    const description = uniqueDescription('Reçu RH')
    await createNote(root, { description, receipt: receipt('png') })
    await root.dispose()

    await loginUI(page, credentialsOf(actor('hrA')))
    await page.goto('/hr')
    await expectReceiptOpens(page, page.getByRole('row').filter({ hasText: description }))
  })

  test('Rejeter → la note disparaît, le manager racine la voit « rejetée »', async ({ browser }) => {
    const root = await loginAs('rootMgrA')
    const description = uniqueDescription('Rejet RH')
    await createNote(root, { description })
    await root.dispose()

    const hrContext = await browser.newContext()
    const hrPage = await hrContext.newPage()
    await loginUI(hrPage, credentialsOf(actor('hrA')))
    await hrPage.goto('/hr')
    const row = hrPage.getByRole('row').filter({ hasText: description })
    await row.getByRole('button', { name: 'Rejeter' }).click()
    await expect(row).toHaveCount(0)
    await hrContext.close()

    const mgrContext = await browser.newContext()
    const mgrPage = await mgrContext.newPage()
    await loginUI(mgrPage, credentialsOf(actor('rootMgrA')))
    await expect(mgrPage.getByRole('row').filter({ hasText: description })).toContainText('rejetée')
    await mgrContext.close()
  })

  test('organigramme : sélecteur sans soi-même ni non-managers ; ni RH ni autre entreprise', async ({ page }) => {
    await loginUI(page, credentialsOf(actor('hrA')))
    await page.goto('/hr')
    const select = page.getByRole('row').filter({ hasText: actor('subMgrA').email }).getByRole('combobox')
    await expect(select).toHaveValue(actor('rootMgrA').id)
    const options = await select.locator('option').allTextContents()
    expect(options[0]).toBe('— aucun (racine) —')
    expect(options).toContain('Root Manager A')
    for (const absent of ['Sub Manager A', 'Employee A1', 'HR A', 'Root Manager B']) expect(options).not.toContain(absent)
    await expect(page.getByRole('row').filter({ hasText: actor('hrA').email })).toHaveCount(0)
    await expect(page.getByRole('row').filter({ hasText: actor('empB').email })).toHaveCount(0)
  })

  test('« — aucun (racine) — » retire le manager', async ({ page }) => {
    const target = actor('reassignUi')
    const hrApi = await loginAs('hrA')
    // État initial garanti même en cas de retry : rattaché à Sub Manager A.
    expect((await hrApi.put(`/api/hr/users/${target.id}/manager`, { data: { managerId: actor('subMgrA').id } })).status()).toBe(200)

    await loginUI(page, credentialsOf(actor('hrA')))
    await page.goto('/hr')
    const select = page.getByRole('row').filter({ hasText: target.email }).getByRole('combobox')
    await expect(select).toHaveValue(actor('subMgrA').id)
    const saved = page.waitForResponse((r) => r.url().includes(`/api/hr/users/${target.id}/manager`) && r.ok())
    await select.selectOption({ label: '— aucun (racine) —' })
    await saved
    await expect(select).toHaveValue('')

    const directory = (await (await hrApi.get('/api/hr/users')).json()) as { id: string; managerId: string | null }[]
    expect(directory.find((u) => u.id === target.id)?.managerId).toBeNull()
    await hrApi.put(`/api/hr/users/${target.id}/manager`, { data: { managerId: actor('subMgrA').id } })
    await hrApi.dispose()
  })

  test('nouvelle entreprise : organigramme et notes vides', async ({ page }) => {
    await signupUI(page, { name: 'Fondatrice', email: `rh@${uniqueDomain()}`, password: 'motdepasse1' })
    await expect(page).toHaveURL(/\/expenses$/)
    await page.goto('/hr')
    await expect(page.getByRole('heading', { name: 'Organigramme (0)' })).toBeVisible()
    await expect(page.getByText('Aucun employé ou manager dans cette entreprise.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Notes des managers racine en attente (0)' })).toBeVisible()
    await expect(page.getByText('Aucune note en attente.')).toBeVisible()
  })
})
