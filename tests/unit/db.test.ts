import { types, type Pool } from 'pg'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPool, withUserScope } from '@/lib/db'

/**
 * Accès base (src/lib/db.ts) : portée utilisateur transactionnelle et pool
 * unique. Le pool est remplacé par un faux via `global.__pgPool` : aucun
 * Postgres requis. Ces garanties comptent pour les optimisations d'accès aux
 * données (PERF-02, pool, requêtes regroupées) :
 *  - le contexte `app.current_user_id` est local à la transaction, sinon il
 *    fuirait vers la requête suivante qui réutilise la connexion du pool ;
 *  - la connexion est toujours rendue au pool, même en cas d'erreur ;
 *  - un seul pool par processus.
 */

const USER_A = '9d6f2c11-3b7a-4c55-8e2d-6a1b0c9f7e22'
const USER_B = '4b0c4a39-6a3e-4e6b-9a54-0d5f8a4f1a11'
const LOCAL_CONTEXT = /set_config\(\s*'app\.current_user_id'\s*,\s*\$1\s*,\s*true\s*\)|SET\s+LOCAL\s+app\.current_user_id/i

interface Statement {
  sql: string
  params?: unknown[]
}

function fakePool(failOn?: RegExp) {
  const clients: { statements: Statement[]; release: ReturnType<typeof vi.fn> }[] = []
  const pool = {
    connect: vi.fn(async () => {
      const statements: Statement[] = []
      const client = {
        statements,
        release: vi.fn(),
        query: vi.fn(async (sql: string, params?: unknown[]) => {
          statements.push({ sql, params })
          await new Promise((resolve) => setTimeout(resolve, 1))
          if (failOn?.test(sql)) throw new Error(`échec : ${sql}`)
          return { rows: [], rowCount: 0 }
        }),
      }
      clients.push(client)
      return client
    }),
  }
  global.__pgPool = pool as unknown as Pool
  return { pool, clients }
}

const sqlOf = (statements: Statement[]) => statements.map((s) => s.sql.trim())

afterEach(() => {
  global.__pgPool = undefined
})

describe('withUserScope', () => {
  it('ouvre une transaction, pose le contexte, exécute, valide et renvoie le résultat', async () => {
    const { clients } = fakePool()
    const result = await withUserScope(USER_A, async (client) => {
      await client.query('SELECT 1')
      return 'résultat'
    })
    expect(result).toBe('résultat')
    const sql = sqlOf(clients[0].statements)
    expect(sql[0]).toMatch(/^BEGIN/i)
    expect(sql[1]).toMatch(LOCAL_CONTEXT)
    expect(sql.slice(2, -1)).toEqual(['SELECT 1'])
    expect(sql.at(-1)).toMatch(/^COMMIT/i)
    expect(clients[0].release).toHaveBeenCalledTimes(1)
  })

  it('le contexte porte l’identifiant de l’utilisateur et reste local à la transaction', async () => {
    const { clients } = fakePool()
    await withUserScope(USER_A, async () => undefined)
    const context = clients[0].statements.find((s) => LOCAL_CONTEXT.test(s.sql))
    expect(context, 'contexte utilisateur posé avec une portée transactionnelle').toBeDefined()
    expect(JSON.stringify(context)).toContain(USER_A)
  })

  it('erreur du traitement : annulation, connexion rendue, erreur propagée', async () => {
    const { clients } = fakePool()
    const failure = new Error('boom')
    await expect(
      withUserScope(USER_A, async () => {
        throw failure
      })
    ).rejects.toBe(failure)
    const sql = sqlOf(clients[0].statements)
    expect(sql).toContainEqual(expect.stringMatching(/^ROLLBACK/i))
    expect(sql).not.toContainEqual(expect.stringMatching(/^COMMIT/i))
    expect(clients[0].release).toHaveBeenCalledTimes(1)
  })

  it('échec du COMMIT : erreur propagée et connexion rendue', async () => {
    const { clients } = fakePool(/^\s*COMMIT/i)
    await expect(withUserScope(USER_A, async () => 'ok')).rejects.toThrow()
    expect(clients[0].release).toHaveBeenCalledTimes(1)
  })

  it('deux portées simultanées utilisent chacune leur connexion et leur contexte', async () => {
    const { clients } = fakePool()
    await Promise.all([
      withUserScope(USER_A, async (client) => client.query('SELECT a')),
      withUserScope(USER_B, async (client) => client.query('SELECT b')),
    ])
    expect(clients).toHaveLength(2)
    const byUser = clients.map((c) => JSON.stringify(c.statements))
    expect(byUser.filter((s) => s.includes(USER_A) && !s.includes(USER_B))).toHaveLength(1)
    expect(byUser.filter((s) => s.includes(USER_B) && !s.includes(USER_A))).toHaveLength(1)
    for (const client of clients) expect(client.release).toHaveBeenCalledTimes(1)
  })
})

describe('getPool', () => {
  it('sans DATABASE_URL : erreur explicite', () => {
    vi.stubEnv('DATABASE_URL', '')
    expect(() => getPool()).toThrow(/DATABASE_URL/)
  })

  it('un seul pool par processus', async () => {
    vi.stubEnv('DATABASE_URL', 'postgres://user:pass@127.0.0.1:1/inexistante')
    const pool = getPool()
    expect(getPool()).toBe(pool)
    await pool.end()
  })
})

describe('types SQL', () => {
  it('une colonne date reste la chaîne AAAA-MM-JJ, sans conversion de fuseau', () => {
    expect(types.getTypeParser(1082, 'text')('2026-03-12')).toBe('2026-03-12')
  })
})
