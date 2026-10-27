import type { Pool } from 'pg'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { withTransaction } from '@/modules/shared/infrastructure/db'

/**
 * Transaction commune (shared/infrastructure/db) : utilisée par withUserScope,
 * l'organigramme et l'inscription. Revue de la PR #6 : un ROLLBACK en échec ne
 * doit ni masquer l'erreur d'origine, ni rendre au pool une connexion cassée.
 */

function fakePool(failOn: RegExp[]) {
  const client = {
    sql: [] as string[],
    release: vi.fn(),
    query: vi.fn(async (sql: string) => {
      client.sql.push(sql)
      const failure = failOn.find((pattern) => pattern.test(sql))
      if (failure) throw new Error(`échec : ${sql}`)
      return { rows: [], rowCount: 0 }
    }),
  }
  global.__pgPool = { connect: vi.fn(async () => client) } as unknown as Pool
  return client
}

afterEach(() => {
  global.__pgPool = undefined
})

describe('withTransaction', () => {
  it('BEGIN, travail, COMMIT, connexion rendue saine', async () => {
    const client = fakePool([])
    expect(await withTransaction(async (c) => (await c.query('SELECT 1'), 'ok'))).toBe('ok')
    expect(client.sql).toEqual(['BEGIN', 'SELECT 1', 'COMMIT'])
    expect(client.release).toHaveBeenCalledWith()
  })

  it('erreur du travail : ROLLBACK, erreur d’origine propagée, connexion rendue saine', async () => {
    const client = fakePool([])
    const failure = new Error('boom')
    await expect(withTransaction(async () => { throw failure })).rejects.toBe(failure)
    expect(client.sql).toEqual(['BEGIN', 'ROLLBACK'])
    expect(client.release).toHaveBeenCalledWith()
  })

  it('ROLLBACK en échec : erreur d’origine propagée, connexion détruite et non rendue au pool', async () => {
    const client = fakePool([/^ROLLBACK/])
    const failure = new Error('boom')
    await expect(withTransaction(async () => { throw failure })).rejects.toBe(failure)
    expect(client.release).toHaveBeenCalledTimes(1)
    expect(client.release.mock.calls[0][0]).toBeInstanceOf(Error)
  })
})
