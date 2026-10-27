import type { UserRole } from '@/domain/User'
import type { Actor } from '@/modules/shared/domain'
import type { PoolClient } from 'pg'
import { getPool, withTransaction } from '@/modules/shared/infrastructure/db'
import type { NewUser, SignupTransaction, UserCredentials, UserRepository } from '../ports/UserRepository'

/**
 * Pas de portée utilisateur : l'inscription et la connexion précèdent toute
 * session (pas d'acteur pour la RLS), et les tables users et companies n'y
 * sont pas soumises. Lectures sur le pool ; l'inscription écrit dans
 * `pgSignupTransaction`.
 */
export class PgUserRepository implements UserRepository {
  constructor(private readonly client?: PoolClient) {}

  private get db(): Pick<PoolClient, 'query'> {
    return this.client ?? getPool()
  }

  async findCredentials(email: string): Promise<UserCredentials | null> {
    const result = await this.db.query<{ id: string; email: string; password_hash: string; role: UserRole }>(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [email]
    )
    const row = result.rows[0]
    return row ? { id: row.id, email: row.email, passwordHash: row.password_hash, role: row.role } : null
  }

  async findActor(id: string): Promise<Actor | null> {
    const result = await this.db.query<Actor>('SELECT id, role FROM users WHERE id = $1', [id])
    return result.rows[0] ?? null
  }

  async emailExists(email: string): Promise<boolean> {
    const result = await this.db.query('SELECT id FROM users WHERE email = $1', [email])
    return (result.rowCount ?? 0) > 0
  }

  async claimCompany(name: string, emailDomain: string): Promise<{ companyId: string; created: boolean }> {
    const inserted = await this.db.query<{ id: string }>(
      `INSERT INTO companies (name, email_domain) VALUES ($1, $2)
       ON CONFLICT (email_domain) DO NOTHING
       RETURNING id`,
      [name, emailDomain]
    )
    if (inserted.rows[0]) return { companyId: inserted.rows[0].id, created: true }
    const existing = await this.db.query<{ id: string }>('SELECT id FROM companies WHERE email_domain = $1', [
      emailDomain,
    ])
    return { companyId: existing.rows[0].id, created: false }
  }

  async createUser(user: NewUser): Promise<boolean> {
    // Email pris entre-temps : aucune ligne écrite, la transaction n'est pas interrompue par une erreur.
    const result = await this.db.query(
      `INSERT INTO users (name, email, password_hash, company_id, role) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [user.name, user.email, user.passwordHash, user.companyId, user.role]
    )
    return (result.rowCount ?? 0) > 0
  }
}

/** Entreprise et premier compte écrits dans une même transaction. */
export const pgSignupTransaction: SignupTransaction = {
  run: (work) => withTransaction((client) => work(new PgUserRepository(client))),
}
