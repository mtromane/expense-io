import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { Client } from 'pg'
import { expect, test } from '@playwright/test'
import { actor } from '../support/actors'
import { apiLogin, credentialsOf, loginAs } from '../support/auth'
import { FAULTY_URL } from '../support/env'
import { paddedPng } from '../support/files'
import { apiError } from '../support/messages'
import { createNote, listOwnNotes, postNote, uniqueDescription } from '../support/notes'
import { expectDefect } from './registry'

loadEnv({ quiet: true })

// expectDefect() est appelé juste avant l'oracle, après la mise en place :
// un échec de setup reste un vrai échec, jamais un « échec attendu ».

test('SEC-06 les clés de reçu ne sont pas devinables', { tag: ['@defect', '@SEC-06'] }, async () => {
  const emp = await loginAs('empA1')
  const first = await createNote(emp)
  const second = await createNote(emp)
  expectDefect('SEC-06')
  for (const key of [first.receiptKey, second.receiptKey]) {
    const name = path.posix.basename(key).replace(/\.[a-z0-9]+$/i, '')
    expect(name, key).not.toMatch(/^\d+$/)
    expect(name.length, key).toBeGreaterThanOrEqual(16)
  }
  expect(first.receiptKey).not.toBe(second.receiptKey)
  await emp.dispose()
})

test('SEC-07 contenu non conforme au type déclaré → 400', { tag: ['@defect', '@SEC-07'] }, async () => {
  const emp = await loginAs('empA1')
  const fake = { name: 'faux.png', mimeType: 'image/png', buffer: Buffer.from('ceci n’est pas une image\n'.repeat(20)) }
  expectDefect('SEC-07')
  const res = await postNote(emp, { receipt: fake })
  expect(res.status()).toBe(400)
  expect(await res.json()).toEqual(apiError('Type de fichier non autorisé pour le reçu'))
  await emp.dispose()
})

test('SEC-08 suggestion OCR : fichier de plus de 10 Mo → 400', { tag: ['@defect', '@SEC-08'] }, async () => {
  test.setTimeout(120_000)
  const emp = await loginAs('empA1')
  const big = paddedPng(10 * 1024 * 1024 + 1)
  expectDefect('SEC-08')
  const res = await emp.post('/api/expense-notes/receipt-suggestion', { multipart: { receipt: big } })
  expect(res.status()).toBe(400)
  expect(await res.json()).toEqual(apiError('Fichier trop volumineux'))
  await emp.dispose()
})

/**
 * SEC-09 : la base isole elle-même les notes (défense en profondeur).
 * Reproduit le contexte posé par l'application (`app.current_user_id`).
 * Si l'équipe archi rend la RLS effective via un rôle dédié (`SET LOCAL ROLE`),
 * elle expose ce rôle dans `APP_DB_ROLE` ; si elle choisit de retirer la RLS,
 * ce test est supprimé avec l'accord de la team Tests (décision ADR).
 */
test('SEC-09 la base n’expose à un utilisateur que ses propres notes', { tag: ['@defect', '@SEC-09'] }, async () => {
  const me = actor('empA1').id
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [me])
    if (process.env.APP_DB_ROLE) {
      await client.query(`SET LOCAL ROLE ${client.escapeIdentifier(process.env.APP_DB_ROLE)}`)
    }
    expectDefect('SEC-09')
    const { rows } = await client.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM expense_notes WHERE user_id <> $1',
      [me]
    )
    expect(rows[0].n).toBe(0)
  } finally {
    await client.query('ROLLBACK').catch(() => undefined)
    await client.end()
  }
})

test('ROB-01 S3 indisponible → aucune note créée', { tag: ['@defect', '@ROB-01'] }, async () => {
  test.setTimeout(60_000)
  const faulty = await apiLogin(credentialsOf(actor('empA2')), FAULTY_URL)
  const main = await loginAs('empA2')
  const description = uniqueDescription('Orpheline')
  expectDefect('ROB-01')
  const res = await postNote(faulty, { description })
  expect(res.status()).toBeGreaterThanOrEqual(500)
  const notes = await listOwnNotes(main)
  expect(notes.filter((n) => n.description === description)).toEqual([])
  await Promise.all([faulty.dispose(), main.dispose()])
})
