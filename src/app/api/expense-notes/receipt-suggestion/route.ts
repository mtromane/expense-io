import { suggestFromReceipt } from '@/modules/receipt-scan'
import { readReceiptForm, receiptFrom, route } from '@/modules/shared/http'

export const POST = route({}, async ({ request }) => {
  const form = await readReceiptForm(request)
  const suggestion = await suggestFromReceipt(receiptFrom(form.get('receipt')))
  return Response.json(suggestion)
})
