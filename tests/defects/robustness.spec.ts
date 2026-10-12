import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test'
import { actor } from '../support/actors'
import { loginAs } from '../support/auth'
import { createNote, postNote, uniqueDescription } from '../support/notes'
import { expectDefect, type DefectId } from './registry'

test('ROB-02 décisions simultanées : exactement une réussite par note',
  { tag: ['@defect', '@ROB-02'] }, async () => {
    expectDefect('ROB-02')
    test.setTimeout(90_000)
    const emp = await loginAs('empA1')
    const mgr = await loginAs('subMgrA')
    const notes = await Promise.all(
      Array.from({ length: 5 }, () => createNote(emp, { description: uniqueDescription('Course') }))
    )
    for (const note of notes) {
      const responses = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          mgr.post(`/api/manager/expense-notes/${note.id}/${i % 2 ? 'reject' : 'approve'}`)
        )
      )
      const statuses = responses.map((r) => r.status())
      expect(statuses.filter((s) => s === 200), `note ${note.id} : ${statuses.join(',')}`).toHaveLength(1)
      expect(statuses.filter((s) => s !== 200).every((s) => s === 409)).toBe(true)
    }
    await Promise.all([emp.dispose(), mgr.dispose()])
  })

interface Ctx {
  emp: APIRequestContext
  hr: APIRequestContext
}

const ROB03: { id: DefectId; name: string; status: number; run: (c: Ctx) => Promise<APIResponse>; after?: (c: Ctx) => Promise<void> }[] = [
  {
    id: 'ROB-03a',
    name: 'UUID invalide dans l’URL → 404',
    status: 404,
    run: (c) => c.emp.get('/api/expense-notes/pas-un-uuid/receipt-url'),
  },
  {
    id: 'ROB-03b',
    name: 'date invalide → 400',
    status: 400,
    run: (c) => postNote(c.emp, { expenseDate: 'pas-une-date' }),
  },
  {
    id: 'ROB-03c',
    name: 'montant au-delà de numeric(10,2) → 400',
    status: 400,
    run: (c) => postNote(c.emp, { amount: '100000000' }),
  },
  {
    id: 'ROB-03d',
    name: 'montant non numérique → 400',
    status: 400,
    run: (c) => postNote(c.emp, { amount: '12abc' }),
  },
  {
    id: 'ROB-03e',
    name: 'PUT manager sans JSON valide → 400, manager conservé',
    status: 400,
    run: (c) =>
      c.hr.put(`/api/hr/users/${actor('reassignRob03').id}/manager`, {
        headers: { 'content-type': 'application/json' },
        data: 'pas du json',
      }),
    after: async (c) => {
      const users = (await (await c.hr.get('/api/hr/users')).json()) as { id: string; managerId: string | null }[]
      expect(users.find((u) => u.id === actor('reassignRob03').id)?.managerId).toBe(actor('subMgrA').id)
    },
  },
]

for (const { id, name, status, run, after } of ROB03) {
  test(`${id} ${name}`, { tag: ['@defect', `@${id}`] }, async () => {
    expectDefect(id)
    const c: Ctx = { emp: await loginAs('empA1'), hr: await loginAs('hrA') }
    const res = await run(c)
    expect(res.status()).toBe(status)
    if (after) await after(c)
    await Promise.all([c.emp.dispose(), c.hr.dispose()])
  })
}
