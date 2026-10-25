import { getPool } from '@/lib/db'
import type { CompanyUser } from '../domain/CompanyUser'
import type { OrganizationRepository } from '../ports/OrganizationRepository'

interface CompanyUserRecord {
  id: string
  name: string
  email: string
  role: 'employee' | 'manager'
  manager_id: string | null
}

function toCompanyUser(row: CompanyUserRecord): CompanyUser {
  return { id: row.id, name: row.name, email: row.email, role: row.role, managerId: row.manager_id }
}

const COMPANY_OF = '(SELECT company_id FROM users WHERE id = $1)'

/**
 * Requêtes hors transaction, comme avant la refacto : une requête par lecture,
 * aucun aller-retour ajouté (la table users n'est pas soumise à la RLS).
 */
export class PgOrganizationRepository implements OrganizationRepository {
  async listDirectory(hrId: string): Promise<CompanyUser[]> {
    const result = await getPool().query<CompanyUserRecord>(
      `SELECT id, name, email, role, manager_id FROM users
       WHERE role IN ('employee', 'manager')
         AND company_id = ${COMPANY_OF}
       ORDER BY name`,
      [hrId]
    )
    return result.rows.map(toCompanyUser)
  }

  async findMember(hrId: string, userId: string): Promise<CompanyUser | null> {
    const result = await getPool().query<CompanyUserRecord>(
      `SELECT id, name, email, role, manager_id FROM users
       WHERE id = $2 AND role IN ('employee', 'manager') AND company_id = ${COMPANY_OF}`,
      [hrId, userId]
    )
    return result.rows[0] ? toCompanyUser(result.rows[0]) : null
  }

  async isManagerOfCompany(hrId: string, managerId: string): Promise<boolean> {
    const result = await getPool().query(
      `SELECT 1 FROM users WHERE id = $2 AND role = 'manager' AND company_id = ${COMPANY_OF}`,
      [hrId, managerId]
    )
    return (result.rowCount ?? 0) > 0
  }

  async setManager(userId: string, managerId: string | null): Promise<CompanyUser> {
    const result = await getPool().query<CompanyUserRecord>(
      `UPDATE users SET manager_id = $1 WHERE id = $2
       RETURNING id, name, email, role, manager_id`,
      [managerId, userId]
    )
    return toCompanyUser(result.rows[0])
  }
}
