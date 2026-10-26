import { getReceiptUrlForApprover } from '@/modules/approval'
import { route } from '@/modules/shared/http'

export const GET = route<{ id: string }>({ role: 'hr_admin' }, async ({ actor, params }) => {
  const url = await getReceiptUrlForApprover(actor, params.id)
  return Response.json({ url })
})
