import { suggestFields } from '@/lib/ocr'
import { route } from '@/modules/shared/http'

export const POST = route({ deniedStatus: 401 }, async ({ request }) => {
  const formData = await request.formData()
  const receipt = formData.get('receipt')
  if (!(receipt instanceof File)) {
    return Response.json({ error: 'Champs invalides' }, { status: 400 })
  }

  const buffer = Buffer.from(await receipt.arrayBuffer())
  const suggestion = await suggestFields({ data: buffer, mimeType: receipt.type })
  return Response.json(suggestion)
})
