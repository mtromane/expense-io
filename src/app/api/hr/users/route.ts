import { listDirectory } from '@/modules/organization'
import { route } from '@/modules/shared/http'

export const GET = route({ role: 'hr_admin' }, async ({ actor }) => {
  const users = await listDirectory(actor)
  return Response.json(users)
})
