import { listApprovalQueue } from '@/modules/approval'
import { presentPendingNote, route } from '@/modules/shared/http'

export const GET = route({ role: 'manager' }, async ({ actor }) => {
  const queue = await listApprovalQueue(actor)
  return Response.json(queue.map(presentPendingNote))
})
