import { getPool } from '@/lib/db'
import { getReceiptUrl } from '@/lib/storage'
import { route } from '@/modules/shared/http'

export const GET = route<{ id: string }>({ role: 'manager', deniedStatus: 401 }, async ({ params }) => {
  const result = await getPool().query('SELECT receipt_key FROM expense_notes WHERE id = $1', [params.id])
  const note = result.rows[0]
  if (!note) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const url = await getReceiptUrl(note.receipt_key)
  return Response.json({ url })
})
