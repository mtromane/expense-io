import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test'
import { actor, type ActorKey } from '../support/actors'
import { loginAs } from '../support/auth'
import { createNote, postNote, uniqueDescription } from '../support/notes'
import { expectDefect, type DefectId } from './registry'

// expectDefect() est appelé juste avant l'oracle, après la mise en place :
// un échec de setup reste un vrai échec, jamais un « échec attendu ».

const RACES: { name: string; author: ActorKey; decider: ActorKey; base: string }[] = [
  { name: 'manager', author: 'empA1', decider: 'subMgrA', base: '/api/manager/expense-notes' },
  { name: 'RH', author: 'rootMgrA', decider: 'hrA', base: '/api/hr/expense-notes' },
]

for (const { name, author, decider, base } of RACES) {
  test(`ROB-02 décisions simultanées (${name}) : exactement une réussite par note`,
    { tag: ['@defect', '@ROB-02'] }, async () => {
      test.setTimeout(90_000)
      const authorCtx = await loginAs(author)
      const deciderCtx = await loginAs(decider)
      const notes = await Promise.all(
        Array.from({ length: 5 }, () => createNote(authorCtx, { description: uniqueDescription('Course') }))
      )
      expectDefect('ROB-02')
      for (const note of notes) {
        const responses = await Promise.all(
          Array.from({ length: 20 }, (_, i) => deciderCtx.post(`${base}/${note.id}/${i % 2 ? 'reject' : 'approve'}`))
        )
        const statuses = responses.map((r) => r.status())
        expect(statuses.filter((s) => s === 200), `note ${note.id} : ${statuses.join(',')}`).toHaveLength(1)
        expect(statuses.filter((s) => s !== 200).every((s) => s === 409)).toBe(true)
      }
      await Promise.all([authorCtx.dispose(), deciderCtx.dispose()])
    })
}

const INVALID_ID_ROUTES: { actor: ActorKey; method: 'GET' | 'POST' | 'PUT'; path: string; data?: unknown }[] = [
  { actor: 'empA1', method: 'GET', path: '/api/expense-notes/pas-un-uuid/receipt-url' },
  { actor: 'subMgrA', method: 'POST', path: '/api/manager/expense-notes/pas-un-uuid/approve' },
  { actor: 'subMgrA', method: 'POST', path: '/api/manager/expense-notes/pas-un-uuid/reject' },
  { actor: 'subMgrA', method: 'GET', path: '/api/manager/expense-notes/pas-un-uuid/receipt-url' },
  { actor: 'hrA', method: 'POST', path: '/api/hr/expense-notes/pas-un-uuid/approve' },
  { actor: 'hrA', method: 'POST', path: '/api/hr/expense-notes/pas-un-uuid/reject' },
  { actor: 'hrA', method: 'GET', path: '/api/hr/expense-notes/pas-un-uuid/receipt-url' },
  { actor: 'hrA', method: 'PUT', path: '/api/hr/users/pas-un-uuid/manager', data: { managerId: null } },
]

for (const route of INVALID_ID_ROUTES) {
  test(`ROB-03a UUID invalide → 404 : ${route.method} ${route.path}`, { tag: ['@defect', '@ROB-03a'] }, async () => {
    const ctx = await loginAs(route.actor)
    expectDefect('ROB-03a')
    const res = await ctx.fetch(route.path, { method: route.method, data: route.data })
    expect(res.status()).toBe(404)
    await ctx.dispose()
  })
}

interface Ctx {
  emp: APIRequestContext
  hr: APIRequestContext
}

const ROB03: { id: DefectId; name: string; status: number; run: (c: Ctx) => Promise<APIResponse>; after?: (c: Ctx) => Promise<void> }[] = [
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
    const c: Ctx = { emp: await loginAs('empA1'), hr: await loginAs('hrA') }
    expectDefect(id)
    const res = await run(c)
    expect(res.status()).toBe(status)
    if (after) await after(c)
    await Promise.all([c.emp.dispose(), c.hr.dispose()])
  })
}
