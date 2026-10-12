import { expect, test, type APIRequestContext } from '@playwright/test'
import { loginAs } from '../support/auth'
import { createNote, listOwnNotes, uniqueDescription, type ExpenseNoteDto } from '../support/notes'

async function pendingFor(mgr: APIRequestContext): Promise<ExpenseNoteDto[]> {
  const res = await mgr.get('/api/manager/expense-notes')
  expect(res.status()).toBe(200)
  return (await res.json()) as ExpenseNoteDto[]
}

test.describe('MGR — validation manager', { tag: '@parity' }, () => {
  let emp: APIRequestContext, sub: APIRequestContext, root: APIRequestContext, empB: APIRequestContext
  test.beforeAll(async () => {
    ;[emp, sub, root, empB] = await Promise.all([
      loginAs('empA1'), loginAs('subMgrA'), loginAs('rootMgrA'), loginAs('empB'),
    ])
  })
  test.afterAll(async () => {
    await Promise.all([emp, sub, root, empB].map((c) => c.dispose()))
  })

  test('liste : notes en attente des rattachés directs uniquement', async () => {
    const fromReport = await createNote(emp)
    const ownNote = await createNote(sub)
    const otherCompany = await createNote(empB)

    const subIds = (await pendingFor(sub)).map((n) => n.id)
    expect(subIds).toContain(fromReport.id)
    expect(subIds).not.toContain(ownNote.id)
    expect(subIds).not.toContain(otherCompany.id)

    const rootIds = (await pendingFor(root)).map((n) => n.id)
    expect(rootIds).toContain(ownNote.id) // rattaché direct
    expect(rootIds).not.toContain(fromReport.id) // N-2 exclu
  })

  test('liste triée par created_at ASC', async () => {
    const first = await createNote(emp, { description: uniqueDescription('ASC 1') })
    const second = await createNote(emp, { description: uniqueDescription('ASC 2') })
    const ids = (await pendingFor(sub)).map((n) => n.id)
    expect(ids.indexOf(first.id)).toBeLessThan(ids.indexOf(second.id))
  })

  for (const [decision, status] of [['approve', 'approved'], ['reject', 'rejected']] as const) {
    test(`${decision} → 200, statut ${status}, retirée de la liste`, async () => {
      const note = await createNote(emp)
      const res = await sub.post(`/api/manager/expense-notes/${note.id}/${decision}`)
      expect(res.status()).toBe(200)
      const body = (await res.json()) as ExpenseNoteDto
      expect(body).toMatchObject({ id: note.id, userId: note.userId, amount: note.amount, status })
      expect(Object.keys(body).sort()).toEqual(Object.keys(note).sort())
      expect((await pendingFor(sub)).map((n) => n.id)).not.toContain(note.id)
      expect((await listOwnNotes(emp)).find((n) => n.id === note.id)?.status).toBe(status)
    })
  }

  test('seconde décision → 409 Already decided', async () => {
    const note = await createNote(emp)
    expect((await sub.post(`/api/manager/expense-notes/${note.id}/approve`)).status()).toBe(200)
    const res = await sub.post(`/api/manager/expense-notes/${note.id}/reject`)
    expect(res.status()).toBe(409)
    expect(await res.json()).toEqual({ error: 'Already decided' })
  })

  test('note hors périmètre → 404, statut inchangé', async () => {
    const note = await createNote(emp)
    const res = await root.post(`/api/manager/expense-notes/${note.id}/approve`)
    expect(res.status()).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not found' })
    expect((await listOwnNotes(emp)).find((n) => n.id === note.id)?.status).toBe('pending')
  })
})
