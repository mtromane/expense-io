import { listPendingNotes } from '@/modules/approval'
import { presentExpenseNote, route } from '@/modules/shared/http'

export const GET = route({ role: 'manager', deniedStatus: 401 }, async ({ actor }) => {
  const notes = await listPendingNotes(actor)
  return Response.json(notes.map(presentExpenseNote))
})
