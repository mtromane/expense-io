import { getMyReceiptUrl } from '@/modules/expenses'
import { route } from '@/modules/shared/http'

export const GET = route<{ id: string }>({}, async ({ actor, params }) => {
  const url = await getMyReceiptUrl(actor, params.id)
  return Response.json({ url })
})
