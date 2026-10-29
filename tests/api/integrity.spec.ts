import { randomUUID } from 'node:crypto'
import { expect, request, test, type APIRequestContext } from '@playwright/test'
import { loginAs } from '../support/auth'
import { paddedPng } from '../support/files'
import { createNote, listOwnNotes, uniqueDescription, type ExpenseNoteDto } from '../support/notes'

// Intégrité des données : ce qui est saisi ressort à l'identique, partout, et
// en entier. Garde-fou des optimisations d'accès aux données (index,
// requêtes réécrites, sélection de colonnes, pagination, cache, conversions
// de types, téléversements parallèles).

async function listFor(ctx: APIRequestContext, url: string): Promise<ExpenseNoteDto[]> {
  const res = await ctx.get(url)
  expect(res.status(), url).toBe(200)
  return (await res.json()) as ExpenseNoteDto[]
}

async function download(url: string): Promise<Buffer> {
  const ctx = await request.newContext()
  const res = await ctx.get(url)
  expect(res.status()).toBe(200)
  const body = await res.body()
  await ctx.dispose()
  return body
}

test.describe('DATA — valeurs restituées à l’identique', { tag: '@parity' }, () => {
  let emp: APIRequestContext
  test.beforeAll(async () => {
    emp = await loginAs('empA1')
  })
  test.afterAll(async () => {
    await emp.dispose()
  })

  for (const amount of ['0.01', '19.99', '1234.56', '99999999.99', '15']) {
    test(`montant ${amount} : identique à la création et dans la liste`, async () => {
      const note = await createNote(emp, { amount })
      expect(note.amount).toBe(Number(amount))
      expect((await listOwnNotes(emp)).find((n) => n.id === note.id)?.amount).toBe(Number(amount))
    })
  }

  // Dates passées : une date postérieure à demain est refusée depuis D20 (MET-06).
  for (const expenseDate of ['2024-02-29', '2000-01-01', '2025-12-31', '1970-01-01']) {
    test(`date ${expenseDate} : identique à la création et dans la liste (aucun décalage de fuseau)`, async () => {
      const note = await createNote(emp, { expenseDate })
      expect(note.expenseDate).toBe(expenseDate)
      expect((await listOwnNotes(emp)).find((n) => n.id === note.id)?.expenseDate).toBe(expenseDate)
    })
  }

  const descriptions = [
    'Café « client » — 10 % 😀',
    `Guillemets "doubles", 'simples' et \\ antislash`,
    '<b>gras</b> & <script>alert(1)</script>',
    "Robert'); DROP TABLE expense_notes;--",
    'Ünïcödé ñ ß 漢字',
  ]
  for (const label of descriptions) {
    test(`description « ${label} » restituée telle quelle`, async () => {
      const description = `${label} ${randomUUID().slice(0, 8)}`
      const note = await createNote(emp, { description })
      expect(note.description).toBe(description)
      expect((await listOwnNotes(emp)).find((n) => n.id === note.id)?.description).toBe(description)
    })
  }
})

test.describe('DATA — même note, même JSON sur tous les endpoints', { tag: '@parity' }, () => {
  test('employé → manager : création, listes et décision cohérentes', async () => {
    const [emp, mgr] = await Promise.all([loginAs('empA1'), loginAs('subMgrA')])
    const created = await createNote(emp, { amount: '73.40', expenseDate: '2026-02-03' })
    expect((await listOwnNotes(emp)).find((n) => n.id === created.id)).toEqual(created)
    expect((await listFor(mgr, '/api/manager/expense-notes')).find((n) => n.id === created.id)).toEqual(created)

    const res = await mgr.post(`/api/manager/expense-notes/${created.id}/approve`)
    expect(res.status()).toBe(200)
    const decided = (await res.json()) as ExpenseNoteDto
    expect(decided).toEqual({ ...created, status: 'approved' })
    expect((await listOwnNotes(emp)).find((n) => n.id === created.id)).toEqual(decided)
    await Promise.all([emp.dispose(), mgr.dispose()])
  })

  test('manager racine → RH : création, listes et décision cohérentes', async () => {
    const [root, hr] = await Promise.all([loginAs('rootMgrA'), loginAs('hrA')])
    const created = await createNote(root, { amount: '8.05', expenseDate: '2025-12-24' })
    expect((await listOwnNotes(root)).find((n) => n.id === created.id)).toEqual(created)
    expect((await listFor(hr, '/api/hr/expense-notes')).find((n) => n.id === created.id)).toEqual(created)

    const res = await hr.post(`/api/hr/expense-notes/${created.id}/reject`)
    expect(res.status()).toBe(200)
    const decided = (await res.json()) as ExpenseNoteDto
    expect(decided).toEqual({ ...created, status: 'rejected' })
    expect((await listOwnNotes(root)).find((n) => n.id === created.id)).toEqual(decided)
    await Promise.all([root.dispose(), hr.dispose()])
  })
})

test.describe('DATA — volume et simultanéité', { tag: '@parity' }, () => {
  test('8 créations simultanées : notes et reçus distincts, chaque reçu intact', async () => {
    test.setTimeout(120_000)
    const emp = await loginAs('empA2')
    // PNG réels complétés par des zéros, tailles toutes différentes : chaque
    // reçu a un contenu unique (et reste valide si SEC-07 contrôle le contenu).
    const files = Array.from({ length: 8 }, (_, i) => paddedPng(2048 + i * 97))
    const notes = await Promise.all(
      files.map((receipt, i) => createNote(emp, { receipt, description: uniqueDescription(`Parallèle ${i}`) }))
    )
    expect(new Set(notes.map((n) => n.id)).size).toBe(8)
    expect(new Set(notes.map((n) => n.receiptKey)).size).toBe(8)
    for (const [i, note] of notes.entries()) {
      const res = await emp.get(`/api/expense-notes/${note.id}/receipt-url`)
      expect(res.status()).toBe(200)
      const body = await download(((await res.json()) as { url: string }).url)
      expect(body.equals(files[i].buffer), `reçu de ${note.description}`).toBe(true)
    }
    await emp.dispose()
  })

  test('aucune limite implicite : 30 notes créées → 30 notes listées (employé et manager)', async () => {
    test.setTimeout(120_000)
    const [emp, mgr] = await Promise.all([loginAs('empA2'), loginAs('subMgrA')])
    const batch = randomUUID().slice(0, 8)
    const created: ExpenseNoteDto[] = []
    for (let i = 0; i < 30; i++) {
      created.push(await createNote(emp, { amount: `${i + 1}.00`, description: `Lot ${batch} n°${i}` }))
    }
    const ids = created.map((n) => n.id)
    const own = new Set((await listOwnNotes(emp)).map((n) => n.id))
    expect(ids.filter((id) => !own.has(id))).toEqual([])
    const pending = new Set((await listFor(mgr, '/api/manager/expense-notes')).map((n) => n.id))
    expect(ids.filter((id) => !pending.has(id))).toEqual([])
    await Promise.all([emp.dispose(), mgr.dispose()])
  })
})
