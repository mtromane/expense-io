import { expect, test, type APIRequestContext } from '@playwright/test'
import { actor } from '../support/actors'
import { loginAs } from '../support/auth'
import { paddedPng, receipt } from '../support/files'
import { apiError } from '../support/messages'
import { createNote, listOwnNotes, postNote, uniqueDescription, UUID_PATTERN, type ExpenseNoteDto } from '../support/notes'

const TEN_MB = 10 * 1024 * 1024

test.describe('EMP — notes de l’employé', { tag: '@parity' }, () => {
  let emp: APIRequestContext
  test.beforeAll(async () => {
    emp = await loginAs('empA1')
  })
  test.afterAll(async () => {
    await emp.dispose()
  })

  test('création → 201 et forme JSON du contrat', async () => {
    const description = uniqueDescription('Contrat')
    const res = await postNote(emp, { amount: '42.50', expenseDate: '2026-03-12', description })
    expect(res.status()).toBe(201)
    const note = (await res.json()) as ExpenseNoteDto
    expect(Object.keys(note).sort()).toEqual(
      ['amount', 'createdAt', 'description', 'expenseDate', 'id', 'receiptKey', 'status', 'userId']
    )
    expect(note).toMatchObject({
      userId: actor('empA1').id,
      amount: 42.5,
      expenseDate: '2026-03-12',
      description,
      status: 'pending',
    })
    expect(note.id).toMatch(UUID_PATTERN)
    expect(note.receiptKey).toMatch(/\.png$/)
    expect(new Date(note.createdAt).toISOString()).toBe(note.createdAt)
  })

  for (const kind of ['png', 'jpg', 'webp', 'pdf'] as const) {
    test(`reçu ${kind} accepté`, async () => {
      const note = await createNote(emp, { receipt: receipt(kind) })
      expect(note.receiptKey.endsWith(`.${kind}`)).toBe(true)
    })
  }

  test('reçu gif refusé', async () => {
    const res = await postNote(emp, { receipt: receipt('gif') })
    expect(res.status()).toBe(400)
    expect(await res.json()).toEqual(apiError('Type de fichier non autorisé pour le reçu'))
  })

  test('reçu de 10 Mo pile accepté', async () => {
    test.setTimeout(60_000)
    const res = await postNote(emp, { receipt: paddedPng(TEN_MB) })
    expect(res.status()).toBe(201)
  })

  test('reçu de 10 Mo + 1 octet refusé', async () => {
    test.setTimeout(60_000)
    const res = await postNote(emp, { receipt: paddedPng(TEN_MB + 1) })
    expect(res.status()).toBe(400)
    expect(await res.json()).toEqual(apiError('Fichier trop volumineux'))
  })

  const invalid: { name: string; multipart: Record<string, string | ReturnType<typeof receipt>> }[] = [
    { name: 'montant absent', multipart: { expenseDate: '2026-03-12', description: 'x', receipt: receipt() } },
    { name: 'montant nul', multipart: { amount: '0', expenseDate: '2026-03-12', description: 'x', receipt: receipt() } },
    { name: 'montant négatif', multipart: { amount: '-5', expenseDate: '2026-03-12', description: 'x', receipt: receipt() } },
    { name: 'date absente', multipart: { amount: '10', description: 'x', receipt: receipt() } },
    { name: 'description vide', multipart: { amount: '10', expenseDate: '2026-03-12', description: '   ', receipt: receipt() } },
    { name: 'reçu absent', multipart: { amount: '10', expenseDate: '2026-03-12', description: 'x' } },
  ]
  for (const { name, multipart } of invalid) {
    test(`validation : ${name} → 400 Champs invalides`, async () => {
      const res = await emp.post('/api/expense-notes', { multipart })
      expect(res.status()).toBe(400)
      expect(await res.json()).toEqual(apiError('Champs invalides'))
    })
  }

  test('liste : uniquement ses notes, created_at DESC', async () => {
    const first = await createNote(emp, { description: uniqueDescription('Ordre 1') })
    const second = await createNote(emp, { description: uniqueDescription('Ordre 2') })
    const notes = await listOwnNotes(emp)
    expect(notes.every((n) => n.userId === actor('empA1').id)).toBe(true)
    const ids = notes.map((n) => n.id)
    expect(ids.indexOf(second.id)).toBeLessThan(ids.indexOf(first.id))
  })

  test('tri légitime ?sort=amount ASC conservé', async () => {
    for (const amount of ['30.00', '10.00', '20.00']) {
      await createNote(emp, { amount, description: uniqueDescription('Tri') })
    }
    const res = await emp.get('/api/expense-notes', { params: { sort: 'amount ASC' } })
    expect(res.status()).toBe(200)
    const amounts = ((await res.json()) as ExpenseNoteDto[]).map((n) => n.amount)
    expect(amounts).toEqual([...amounts].sort((a, b) => a - b))
  })
})
