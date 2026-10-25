import { listMyExpenseNotes, submitExpenseNote, type IncomingReceipt } from '@/modules/expenses'
import { presentExpenseNote, route } from '@/modules/shared/http'

export const GET = route({ deniedStatus: 401 }, async ({ request, actor }) => {
  const sort = new URL(request.url).searchParams.get('sort')
  const notes = await listMyExpenseNotes(actor, sort)
  return Response.json(notes.map(presentExpenseNote))
})

function incomingReceipt(value: FormDataEntryValue | null): IncomingReceipt | null {
  if (!(value instanceof File)) return null
  return { declaredType: value.type, size: value.size, read: async () => new Uint8Array(await value.arrayBuffer()) }
}

export const POST = route({ deniedStatus: 401 }, async ({ request, actor }) => {
  const form = await request.formData()
  const note = await submitExpenseNote({
    actor,
    amount: form.get('amount'),
    expenseDate: form.get('expenseDate'),
    description: form.get('description'),
    receipt: incomingReceipt(form.get('receipt')),
  })
  return Response.json(presentExpenseNote(note), { status: 201 })
})
