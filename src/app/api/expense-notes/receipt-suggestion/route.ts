import { suggestFromReceipt } from '@/modules/receipt-scan'
import { assertBodyFitsReceipt, receiptFrom, route } from '@/modules/shared/http'

export const POST = route({ deniedStatus: 401 }, async ({ request }) => {
  assertBodyFitsReceipt(request)
  const form = await request.formData()
  const suggestion = await suggestFromReceipt(receiptFrom(form.get('receipt')))
  return Response.json(suggestion)
})
