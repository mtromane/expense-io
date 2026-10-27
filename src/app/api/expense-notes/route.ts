import { listMyExpenseNotes, submitExpenseNote } from '@/modules/expenses'
import { presentExpenseNote, readReceiptForm, receiptFrom, route } from '@/modules/shared/http'

export const GET = route({}, async ({ request, actor }) => {
  const sort = new URL(request.url).searchParams.get('sort')
  const notes = await listMyExpenseNotes(actor, sort)
  return Response.json(notes.map(presentExpenseNote))
})

export const POST = route({}, async ({ request, actor }) => {
  const form = await readReceiptForm(request)
  const note = await submitExpenseNote({
    actor,
    amount: form.get('amount'),
    expenseDate: form.get('expenseDate'),
    description: form.get('description'),
    receipt: receiptFrom(form.get('receipt')),
  })
  return Response.json(presentExpenseNote(note), { status: 201 })
})
