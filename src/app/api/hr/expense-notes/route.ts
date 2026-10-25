import { withUserScope } from '@/lib/db'
import { presentExpenseNoteRow, route } from '@/modules/shared/http'

export const GET = route({ role: 'hr_admin', deniedStatus: 403 }, async ({ actor }) =>
  withUserScope(actor.id, async (client) => {
    const result = await client.query(
      `SELECT en.* FROM expense_notes en
       JOIN users u ON u.id = en.user_id
       WHERE u.role = 'manager' AND u.manager_id IS NULL AND en.status = 'pending'
         AND u.company_id = (SELECT company_id FROM users WHERE id = $1)
       ORDER BY en.created_at ASC`,
      [actor.id]
    )
    return Response.json(result.rows.map(presentExpenseNoteRow))
  })
)
