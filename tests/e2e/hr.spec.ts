import { expect, test } from '@playwright/test'
import { actor } from '../support/actors'
import { credentialsOf, loginAs } from '../support/auth'
import { createNote, listOwnNotes, uniqueDescription, type ExpenseNoteDto } from '../support/notes'
import { loginUI } from '../support/ui'

test.describe('E2E-05 — espace RH', { tag: '@parity' }, () => {
  test('la RH assigne un manager → le manager voit la note', async ({ page }) => {
    const target = actor('reassignE2E')
    const hrApi = await loginAs('hrA')
    // État initial garanti même en cas de retry : sans manager.
    await hrApi.put(`/api/hr/users/${target.id}/manager`, { data: { managerId: null } })
    const emp = await loginAs('reassignE2E')
    const note = await createNote(emp, { description: uniqueDescription('Réassignation') })

    await loginUI(page, credentialsOf(actor('hrA')))
    await page.goto('/hr')
    const row = page.getByRole('row').filter({ hasText: target.email })
    const saved = page.waitForResponse((r) => r.url().includes(`/api/hr/users/${target.id}/manager`) && r.ok())
    await row.getByRole('combobox').selectOption({ label: 'Sub Manager A' })
    await saved

    const mgr = await loginAs('subMgrA')
    const pending = (await (await mgr.get('/api/manager/expense-notes')).json()) as ExpenseNoteDto[]
    expect(pending.map((n) => n.id)).toContain(note.id)
    await Promise.all([hrApi.dispose(), emp.dispose(), mgr.dispose()])
  })

  test('la RH approuve une note de manager racine', async ({ page }) => {
    const root = await loginAs('rootMgrA')
    const description = uniqueDescription('Racine')
    const note = await createNote(root, { description })

    await loginUI(page, credentialsOf(actor('hrA')))
    await page.goto('/hr')
    const row = page.getByRole('row').filter({ hasText: description })
    await row.getByRole('button', { name: 'Approuver' }).click()
    await expect(row).toHaveCount(0)
    expect((await listOwnNotes(root)).find((n) => n.id === note.id)?.status).toBe('approved')
    await root.dispose()
  })
})
