import { changeRole } from '@/modules/organization'
import { route } from '@/modules/shared/http'

export const PUT = route<{ id: string }>({ role: 'hr_admin' }, async ({ request, actor, params }) => {
  // Corps illisible → undefined, refusé par le cas d'usage.
  const input: unknown = await request.json().catch(() => undefined)
  const user = await changeRole({ actor, userId: params.id, input })
  return Response.json(user)
})
