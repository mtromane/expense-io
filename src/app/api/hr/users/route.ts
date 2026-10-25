import { getPool } from '@/lib/db'
import { presentCompanyUserRow, route } from '@/modules/shared/http'

export const GET = route({ role: 'hr_admin', deniedStatus: 403 }, async ({ actor }) => {
  const result = await getPool().query(
    `SELECT id, name, email, role, manager_id FROM users
     WHERE role IN ('employee', 'manager')
       AND company_id = (SELECT company_id FROM users WHERE id = $1)
     ORDER BY name`,
    [actor.id]
  )
  return Response.json(result.rows.map(presentCompanyUserRow))
})
