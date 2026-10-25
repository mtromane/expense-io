import { withUserScope } from '@/lib/db'
import { presentExpenseNoteRow, route } from '@/modules/shared/http'

export const POST = route<{ id: string }>({ role: 'manager', deniedStatus: 401 }, async ({ actor, params }) =>
  withUserScope(actor.id, async (client) => {
    const existing = await client.query(
      `SELECT en.* FROM expense_notes en
       JOIN users u ON u.id = en.user_id
       WHERE en.id = $1 AND u.manager_id = $2`,
      [params.id, actor.id]
    )
    const row = existing.rows[0]
    if (!row) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }
    if (row.status !== 'pending') {
      return Response.json({ error: 'Already decided' }, { status: 409 })
    }

    const updated = await client.query(
      `UPDATE expense_notes SET status = 'rejected' WHERE id = $1 RETURNING *`,
      [params.id]
    )
    return Response.json(presentExpenseNoteRow(updated.rows[0]))
  })
)
