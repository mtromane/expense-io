import { assignManager } from '@/modules/organization'
import { route } from '@/modules/shared/http'

export const PUT = route<{ id: string }>({ role: 'hr_admin', deniedStatus: 403 }, async ({ request, actor, params }) => {
  // Corps illisible → undefined, refusé par le cas d'usage (jamais lu comme « retirer le manager », ROB-03e).
  const input: unknown = await request.json().catch(() => undefined)
  const user = await assignManager({ actor, userId: params.id, input })
  return Response.json(user)
})
