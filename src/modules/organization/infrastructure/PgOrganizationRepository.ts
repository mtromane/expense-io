import { getPool } from '@/modules/shared/infrastructure/db'
import type { AssignableRole, CompanyUser, HrUser } from '../domain/CompanyUser'
import type { OrganizationRepository } from '../ports/OrganizationRepository'

interface UserRecord {
  id: string
  name: string
  email: string
  role: 'employee' | 'manager' | 'hr_admin'
  manager_id: string | null
}

function toCompanyUser(row: UserRecord): CompanyUser {
  return { id: row.id, name: row.name, email: row.email, role: row.role as CompanyUser['role'], managerId: row.manager_id }
}

function toUser(row: UserRecord): CompanyUser | HrUser {
  return row.role === 'hr_admin'
    ? { id: row.id, name: row.name, email: row.email, role: 'hr_admin', managerId: row.manager_id }
    : toCompanyUser(row)
}

const COLUMNS = 'id, name, email, role, manager_id'
const COMPANY_OF = '(SELECT company_id FROM users WHERE id = $1)'

/** Garde-fou contre une profondeur anormale (données corrompues) dans la remontée de la hiérarchie. */
const MAX_HIERARCHY_DEPTH = 100

/**
 * Requêtes hors transaction, comme avant la refacto : une requête par lecture,
 * aucun aller-retour ajouté (la table users n'est pas soumise à la RLS).
 */
export class PgOrganizationRepository implements OrganizationRepository {
  async listDirectory(hrId: string): Promise<CompanyUser[]> {
    const result = await getPool().query<UserRecord>(
      `SELECT ${COLUMNS} FROM users
       WHERE role IN ('employee', 'manager')
         AND company_id = ${COMPANY_OF}
       ORDER BY name`,
      [hrId]
    )
    return result.rows.map(toCompanyUser)
  }

  async findMember(hrId: string, userId: string): Promise<CompanyUser | null> {
    const result = await getPool().query<UserRecord>(
      `SELECT ${COLUMNS} FROM users
       WHERE id = $2 AND role IN ('employee', 'manager') AND company_id = ${COMPANY_OF}`,
      [hrId, userId]
    )
    return result.rows[0] ? toCompanyUser(result.rows[0]) : null
  }

  async findHr(hrId: string): Promise<HrUser | null> {
    const result = await getPool().query<UserRecord>(
      `SELECT ${COLUMNS} FROM users WHERE id = $1 AND role = 'hr_admin'`,
      [hrId]
    )
    return result.rows[0] ? (toUser(result.rows[0]) as HrUser) : null
  }

  async isManagerOfCompany(hrId: string, managerId: string): Promise<boolean> {
    const result = await getPool().query(
      `SELECT 1 FROM users WHERE id = $2 AND role = 'manager' AND company_id = ${COMPANY_OF}`,
      [hrId, managerId]
    )
    return (result.rowCount ?? 0) > 0
  }

  async isAboveInHierarchy(userId: string, managerId: string): Promise<boolean> {
    // Remonte la chaîne des managers à partir de `managerId` ; `userId` y figure → cycle.
    const result = await getPool().query(
      `WITH RECURSIVE chain (id, manager_id, depth) AS (
         SELECT id, manager_id, 0 FROM users WHERE id = $1
         UNION ALL
         SELECT u.id, u.manager_id, chain.depth + 1
         FROM users u JOIN chain ON u.id = chain.manager_id
         WHERE chain.depth < ${MAX_HIERARCHY_DEPTH}
       )
       SELECT 1 FROM chain WHERE id = $2 LIMIT 1`,
      [managerId, userId]
    )
    return (result.rowCount ?? 0) > 0
  }

  async hasDirectReports(managerId: string): Promise<boolean> {
    const result = await getPool().query('SELECT 1 FROM users WHERE manager_id = $1 LIMIT 1', [managerId])
    return (result.rowCount ?? 0) > 0
  }

  async setManager(userId: string, managerId: string | null): Promise<CompanyUser | HrUser> {
    const result = await getPool().query<UserRecord>(
      `UPDATE users SET manager_id = $1 WHERE id = $2
       RETURNING ${COLUMNS}`,
      [managerId, userId]
    )
    return toUser(result.rows[0])
  }

  async setRole(userId: string, role: AssignableRole): Promise<CompanyUser> {
    const result = await getPool().query<UserRecord>(
      `UPDATE users SET role = $1 WHERE id = $2 AND role IN ('employee', 'manager')
       RETURNING ${COLUMNS}`,
      [role, userId]
    )
    return toCompanyUser(result.rows[0])
  }
}
