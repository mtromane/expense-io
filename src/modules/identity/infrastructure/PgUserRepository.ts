import type { UserRole } from '@/domain/User'
import { getPool } from '@/modules/shared/infrastructure/db'
import type { NewUser, UserCredentials, UserRepository } from '../ports/UserRepository'

/**
 * Requêtes hors transaction, comme avant la refacto : l'inscription et la
 * connexion précèdent toute session (pas d'acteur pour la RLS), et les tables
 * users et companies n'y sont pas soumises.
 */
export class PgUserRepository implements UserRepository {
  async findCredentials(email: string): Promise<UserCredentials | null> {
    const result = await getPool().query<{ id: string; email: string; password_hash: string; role: UserRole }>(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [email]
    )
    const row = result.rows[0]
    return row ? { id: row.id, email: row.email, passwordHash: row.password_hash, role: row.role } : null
  }

  async emailExists(email: string): Promise<boolean> {
    const result = await getPool().query('SELECT id FROM users WHERE email = $1', [email])
    return (result.rowCount ?? 0) > 0
  }

  async claimCompany(name: string, emailDomain: string): Promise<{ companyId: string; created: boolean }> {
    const inserted = await getPool().query<{ id: string }>(
      `INSERT INTO companies (name, email_domain) VALUES ($1, $2)
       ON CONFLICT (email_domain) DO NOTHING
       RETURNING id`,
      [name, emailDomain]
    )
    if (inserted.rows[0]) return { companyId: inserted.rows[0].id, created: true }
    const existing = await getPool().query<{ id: string }>('SELECT id FROM companies WHERE email_domain = $1', [
      emailDomain,
    ])
    return { companyId: existing.rows[0].id, created: false }
  }

  async createUser(user: NewUser): Promise<void> {
    await getPool().query(
      'INSERT INTO users (name, email, password_hash, company_id, role) VALUES ($1, $2, $3, $4, $5)',
      [user.name, user.email, user.passwordHash, user.companyId, user.role]
    )
  }
}
