import { expect, test, type APIRequestContext } from '@playwright/test'
import { actor } from '../support/actors'
import { loginAs } from '../support/auth'
import { createNote, listOwnNotes, type ExpenseNoteDto } from '../support/notes'

interface CompanyUserDto {
  id: string
  name: string
  email: string
  role: 'employee' | 'manager'
  managerId: string | null
}

async function pendingFor(hr: APIRequestContext): Promise<ExpenseNoteDto[]> {
  const res = await hr.get('/api/hr/expense-notes')
  expect(res.status()).toBe(200)
  return (await res.json()) as ExpenseNoteDto[]
}

test.describe('HR — espace RH', { tag: '@parity' }, () => {
  let hrA: APIRequestContext, hrB: APIRequestContext, rootA: APIRequestContext
  let sub: APIRequestContext, emp: APIRequestContext, rootB: APIRequestContext
  test.beforeAll(async () => {
    ;[hrA, hrB, rootA, sub, emp, rootB] = await Promise.all([
      loginAs('hrA'), loginAs('hrB'), loginAs('rootMgrA'), loginAs('subMgrA'), loginAs('empA1'), loginAs('rootMgrB'),
    ])
  })
  test.afterAll(async () => {
    await Promise.all([hrA, hrB, rootA, sub, emp, rootB].map((c) => c.dispose()))
  })

  test('liste : notes en attente des managers racine de son entreprise', async () => {
    const rootNote = await createNote(rootA)
    const subNote = await createNote(sub)
    const empNote = await createNote(emp)
    const rootBNote = await createNote(rootB)

    const idsA = (await pendingFor(hrA)).map((n) => n.id)
    expect(idsA).toContain(rootNote.id)
    expect(idsA).not.toContain(subNote.id)
    expect(idsA).not.toContain(empNote.id)
    expect(idsA).not.toContain(rootBNote.id)

    const idsB = (await pendingFor(hrB)).map((n) => n.id)
    expect(idsB).toContain(rootBNote.id)
    expect(idsB).not.toContain(rootNote.id)
  })

  for (const [decision, status] of [['approve', 'approved'], ['reject', 'rejected']] as const) {
    test(`${decision} → 200 ${status} ; seconde décision → 409`, async () => {
      const note = await createNote(rootA)
      const res = await hrA.post(`/api/hr/expense-notes/${note.id}/${decision}`)
      expect(res.status()).toBe(200)
      expect(await res.json()).toMatchObject({ id: note.id, status })
      const again = await hrA.post(`/api/hr/expense-notes/${note.id}/approve`)
      expect(again.status()).toBe(409)
      expect(await again.json()).toEqual({ error: 'Already decided' })
      expect((await listOwnNotes(rootA)).find((n) => n.id === note.id)?.status).toBe(status)
    })
  }

  test('RH d’une autre entreprise → 404', async () => {
    const note = await createNote(rootA)
    const res = await hrB.post(`/api/hr/expense-notes/${note.id}/approve`)
    expect(res.status()).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not found' })
  })

  test('annuaire : employés et managers de l’entreprise, triés par nom, sans RH', async () => {
    const res = await hrA.get('/api/hr/users')
    expect(res.status()).toBe(200)
    const users = (await res.json()) as CompanyUserDto[]
    for (const u of users) {
      expect(Object.keys(u).sort()).toEqual(['email', 'id', 'managerId', 'name', 'role'])
      expect(['employee', 'manager']).toContain(u.role)
    }
    const ids = users.map((u) => u.id)
    for (const key of ['rootMgrA', 'subMgrA', 'empA1', 'empNoMgrA'] as const) expect(ids).toContain(actor(key).id)
    expect(ids).not.toContain(actor('hrA').id)
    expect(ids).not.toContain(actor('empB').id)
    const names = users.map((u) => u.name)
    expect(names.indexOf('Employee A1')).toBeLessThan(names.indexOf('Root Manager A'))
    expect(names.indexOf('Root Manager A')).toBeLessThan(names.indexOf('Sub Manager A'))
  })

  test('assignation : 200 avec forme JSON, puis null → racine', async () => {
    const target = actor('reassignHrApi')
    const set = await hrA.put(`/api/hr/users/${target.id}/manager`, { data: { managerId: actor('rootMgrA').id } })
    expect(set.status()).toBe(200)
    expect(await set.json()).toEqual({
      id: target.id, name: target.name, email: target.email, role: 'employee', managerId: actor('rootMgrA').id,
    })
    const unset = await hrA.put(`/api/hr/users/${target.id}/manager`, { data: { managerId: null } })
    expect(unset.status()).toBe(200)
    expect(((await unset.json()) as CompanyUserDto).managerId).toBeNull()
  })

  test('assignation à soi-même → 409 Invalid manager', async () => {
    const id = actor('subMgrA').id
    const res = await hrA.put(`/api/hr/users/${id}/manager`, { data: { managerId: id } })
    expect(res.status()).toBe(409)
    expect(await res.json()).toEqual({ error: 'Invalid manager' })
  })

  test('assignation d’un non-manager → 409 Invalid manager', async () => {
    const res = await hrA.put(`/api/hr/users/${actor('reassignHrApi').id}/manager`, {
      data: { managerId: actor('empA1').id },
    })
    expect(res.status()).toBe(409)
    expect(await res.json()).toEqual({ error: 'Invalid manager' })
  })

  test('cible d’une autre entreprise → 404', async () => {
    const res = await hrA.put(`/api/hr/users/${actor('empB').id}/manager`, {
      data: { managerId: actor('rootMgrA').id },
    })
    expect(res.status()).toBe(404)
    expect(await res.json()).toEqual({ error: 'Not found' })
  })
})
