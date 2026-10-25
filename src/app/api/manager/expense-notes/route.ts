import { withUserScope } from '@/lib/db'
import { presentExpenseNoteRow, route } from '@/modules/shared/http'

export const GET = route({ role: 'manager', deniedStatus: 401 }, async ({ actor }) =>
  withUserScope(actor.id, async (client) => {
    const result = await client.query(
      `SELECT en.* FROM expense_notes en
       JOIN users u ON u.id = en.user_id
       WHERE u.manager_id = $1 AND en.status = 'pending'
       ORDER BY en.created_at ASC`,
      [actor.id]
    )
    return Response.json(result.rows.map(presentExpenseNoteRow))
  })
)
