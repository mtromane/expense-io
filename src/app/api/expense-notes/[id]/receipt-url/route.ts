import { withUserScope } from '@/lib/db'
import { getReceiptUrl } from '@/lib/storage'
import { route } from '@/modules/shared/http'

export const GET = route<{ id: string }>({ deniedStatus: 401 }, async ({ actor, params }) => {
  const note = await withUserScope(actor.id, async (client) => {
    const result = await client.query(
      'SELECT receipt_key FROM expense_notes WHERE id = $1 AND user_id = $2',
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
