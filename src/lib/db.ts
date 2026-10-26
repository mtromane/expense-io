import { Pool, types, type PoolClient } from 'pg'
import { appDbRole, databaseUrl } from '@/config'

// OID 1082 = date. Garde la chaîne "YYYY-MM-DD" brute renvoyée par Postgres
// plutôt qu'un objet Date JS calé sur le fuseau local.
types.setTypeParser(1082, (value: string) => value)

declare global {
  var __pgPool: Pool | undefined
}

export function getPool(): Pool {
  if (!global.__pgPool) {
    global.__pgPool = new Pool({ connectionString: databaseUrl(), max: 20 })
  }
  return global.__pgPool
}

/**
 * Transaction dans le contexte d'un utilisateur : l'identifiant courant est
 * exposé aux policies RLS et la transaction passe sur le rôle sans privilège
 * APP_DB_ROLE, pour que ces policies s'appliquent (le compte de DATABASE_URL
 * est superuser). Les deux réglages sont locaux à la transaction et posés en
 * une seule instruction : aucun aller-retour ajouté.
 */
export async function withUserScope<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT set_config('app.current_user_id', $1, true), set_config('role', $2, true)", [
      userId,
      appDbRole(),
    ])
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
