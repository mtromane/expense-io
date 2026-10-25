import { getPool } from '@/lib/db'
import { presentCompanyUserRow, route } from '@/modules/shared/http'

export const PUT = route<{ id: string }>({ role: 'hr_admin', deniedStatus: 403 }, async ({ request, actor, params }) => {
  const { id } = params
  const body = (await request.json().catch(() => null)) as { managerId?: string | null } | null
  const managerId = body?.managerId ?? null

  const hrAdminResult = await getPool().query('SELECT company_id FROM users WHERE id = $1', [actor.id])
  const companyId = hrAdminResult.rows[0]?.company_id
  if (!companyId) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const targetResult = await getPool().query(
    `SELECT id FROM users WHERE id = $1 AND company_id = $2 AND role IN ('employee', 'manager')`,
    [id, companyId]
  )
  if (!targetResult.rows[0]) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  if (managerId !== null) {
    if (managerId === id) {
      return Response.json({ error: 'Invalid manager' }, { status: 409 })
    }
    const managerResult = await getPool().query(`SELECT id FROM users WHERE id = $1 AND role = 'manager'`, [
      managerId,
    ])
    if (!managerResult.rows[0]) {
      return Response.json({ error: 'Invalid manager' }, { status: 409 })
    }
  }

  const updated = await getPool().query(
    `UPDATE users SET manager_id = $1 WHERE id = $2
     RETURNING id, name, email, role, manager_id`,
    [managerId, id]
  )
  return Response.json(presentCompanyUserRow(updated.rows[0]))
})
