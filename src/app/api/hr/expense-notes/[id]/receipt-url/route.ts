import { withUserScope } from '@/lib/db'
import { getReceiptUrl } from '@/lib/storage'
import { route } from '@/modules/shared/http'

export const GET = route<{ id: string }>({ role: 'hr_admin', deniedStatus: 403 }, async ({ actor, params }) => {
  const note = await withUserScope(actor.id, async (client) => {
    const result = await client.query(
      `SELECT en.receipt_key FROM expense_notes en
       JOIN users u ON u.id = en.user_id
       WHERE en.id = $1 AND u.role = 'manager' AND u.manager_id IS NULL
         AND u.company_id = (SELECT company_id FROM users WHERE id = $2)`,
      [params.id, actor.id]
    )
    return result.rows[0]
  })
  if (!note) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const url = await getReceiptUrl(note.receipt_key)
  return Response.json({ url })
})
