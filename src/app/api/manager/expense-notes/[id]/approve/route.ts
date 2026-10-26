import { decideExpenseNote } from '@/modules/approval'
import { presentExpenseNote, route } from '@/modules/shared/http'

export const POST = route<{ id: string }>({ role: 'manager' }, async ({ actor, params }) => {
  const note = await decideExpenseNote({ actor, noteId: params.id, decision: 'approve' })
  return Response.json(presentExpenseNote(note))
})
