import { decideExpenseNote } from '@/modules/approval'
import { presentExpenseNote, route } from '@/modules/shared/http'

export const POST = route<{ id: string }>({ role: 'manager', deniedStatus: 401 }, async ({ actor, params }) => {
  const note = await decideExpenseNote({ actor, noteId: params.id, decision: 'reject' })
  return Response.json(presentExpenseNote(note))
})
