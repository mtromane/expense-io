import { expect, test, type APIRequestContext } from '@playwright/test'
import { actor } from '../support/actors'
import { loginAs } from '../support/auth'
import { createNote, listOwnNotes, uniqueDescription, type ExpenseNoteDto } from '../support/notes'

// Cycle de vie d'une note et règles de visibilité qui ne sont pas couvertes
// par MGR / HR. Les défauts métier MET-01 à MET-09 ne sont volontairement pas
// figés ici (décision en attente) : en particulier, aucune assertion sur les
// notes créées AVANT un changement de hiérarchie (MET-07).

async function ids(ctx: APIRequestContext, url: string): Promise<string[]> {
  const res = await ctx.get(url)
  expect(res.status(), url).toBe(200)
  return ((await res.json()) as ExpenseNoteDto[]).map((n) => n.id)
}

const MANAGER_LIST = '/api/manager/expense-notes'
const HR_LIST = '/api/hr/expense-notes'

test.describe('FLOW — cycle de vie et visibilité', { tag: '@parity' }, () => {
  let emp: APIRequestContext, sub: APIRequestContext, root: APIRequestContext, hr: APIRequestContext
  test.beforeAll(async () => {
    ;[emp, sub, root, hr] = await Promise.all([loginAs('empA1'), loginAs('subMgrA'), loginAs('rootMgrA'), loginAs('hrA')])
  })
  test.afterAll(async () => {
    await Promise.all([emp, sub, root, hr].map((c) => c.dispose()))
  })

  test('liste RH triée par created_at ASC', async () => {
    const first = await createNote(root, { description: uniqueDescription('RH ASC 1') })
    const second = await createNote(root, { description: uniqueDescription('RH ASC 2') })
    const list = await ids(hr, HR_LIST)
    expect(list.indexOf(first.id)).toBeGreaterThanOrEqual(0)
    expect(list.indexOf(first.id)).toBeLessThan(list.indexOf(second.id))
  })

  for (const decision of ['approve', 'reject'] as const) {
    test(`RH ${decision} → la note quitte la liste RH`, async () => {
      const note = await createNote(root)
      expect(await ids(hr, HR_LIST)).toContain(note.id)
      expect((await hr.post(`/api/hr/expense-notes/${note.id}/${decision}`)).status()).toBe(200)
      expect(await ids(hr, HR_LIST)).not.toContain(note.id)
    })
  }

  test('l’employé garde toutes ses notes, quel que soit leur statut', async () => {
    const pending = await createNote(emp, { description: uniqueDescription('Statut attente') })
    const approved = await createNote(emp, { description: uniqueDescription('Statut approuvée') })
    const rejected = await createNote(emp, { description: uniqueDescription('Statut rejetée') })
    expect((await sub.post(`/api/manager/expense-notes/${approved.id}/approve`)).status()).toBe(200)
    expect((await sub.post(`/api/manager/expense-notes/${rejected.id}/reject`)).status()).toBe(200)
    const statuses = new Map((await listOwnNotes(emp)).map((n) => [n.id, n.status]))
    expect(statuses.get(pending.id)).toBe('pending')
    expect(statuses.get(approved.id)).toBe('approved')
    expect(statuses.get(rejected.id)).toBe('rejected')
  })

  test('décision refusée (409) : le statut reste celui de la première décision', async () => {
    const note = await createNote(emp)
    expect((await sub.post(`/api/manager/expense-notes/${note.id}/approve`)).status()).toBe(200)
    expect((await sub.post(`/api/manager/expense-notes/${note.id}/reject`)).status()).toBe(409)
    expect((await sub.post(`/api/manager/expense-notes/${note.id}/approve`)).status()).toBe(409)
    expect((await listOwnNotes(emp)).find((n) => n.id === note.id)?.status).toBe('approved')
  })

  test('un manager ne peut pas trancher sa propre note (404, reste en attente)', async () => {
    for (const ctx of [sub, root]) {
      const note = await createNote(ctx)
      for (const decision of ['approve', 'reject']) {
        const res = await ctx.post(`/api/manager/expense-notes/${note.id}/${decision}`)
        expect(res.status()).toBe(404)
        expect(await res.json()).toEqual({ error: 'Not found' })
      }
      expect((await listOwnNotes(ctx)).find((n) => n.id === note.id)?.status).toBe('pending')
      expect(await ids(ctx, MANAGER_LIST)).not.toContain(note.id)
    }
  })

  test('la RH ne tranche que les notes de managers racine (note d’employé ou de sous-manager → 404)', async () => {
    for (const ctx of [emp, sub]) {
      const note = await createNote(ctx)
      expect(await ids(hr, HR_LIST)).not.toContain(note.id)
      for (const route of ['approve', 'reject', 'receipt-url']) {
        const res = route === 'receipt-url'
          ? await hr.get(`/api/hr/expense-notes/${note.id}/receipt-url`)
          : await hr.post(`/api/hr/expense-notes/${note.id}/${route}`)
        expect(res.status(), route).toBe(404)
      }
      expect((await listOwnNotes(ctx)).find((n) => n.id === note.id)?.status).toBe('pending')
    }
  })

  test('manager rendu racine → ses nouvelles notes vont à la RH ; rattaché à nouveau → à son manager', async () => {
    const target = actor('reassignRoot')
    const mgr = await loginAs('reassignRoot')
    const setManager = async (managerId: string | null) => {
      const res = await hr.put(`/api/hr/users/${target.id}/manager`, { data: { managerId } })
      expect(res.status()).toBe(200)
      const directory = (await (await hr.get('/api/hr/users')).json()) as { id: string; managerId: string | null }[]
      expect(directory.find((u) => u.id === target.id)?.managerId).toBe(managerId)
    }

    await setManager(null)
    const asRoot = await createNote(mgr, { description: uniqueDescription('Racine') })
    expect(await ids(hr, HR_LIST)).toContain(asRoot.id)
    expect(await ids(root, MANAGER_LIST)).not.toContain(asRoot.id)
    expect((await hr.post(`/api/hr/expense-notes/${asRoot.id}/approve`)).status()).toBe(200)

    await setManager(actor('rootMgrA').id)
    const asReport = await createNote(mgr, { description: uniqueDescription('Rattaché') })
    expect(await ids(root, MANAGER_LIST)).toContain(asReport.id)
    expect(await ids(hr, HR_LIST)).not.toContain(asReport.id)
    expect((await hr.post(`/api/hr/expense-notes/${asReport.id}/approve`)).status()).toBe(404)
    expect((await root.post(`/api/manager/expense-notes/${asReport.id}/approve`)).status()).toBe(200)

    const statuses = new Map((await listOwnNotes(mgr)).map((n) => [n.id, n.status]))
    expect([statuses.get(asRoot.id), statuses.get(asReport.id)]).toEqual(['approved', 'approved'])
    await mgr.dispose()
  })
})
