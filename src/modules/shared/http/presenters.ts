import type { ExpenseNote, ExpenseNoteStatus } from '@/domain/ExpenseNote'

/** Note de frais telle que décrite par le contrat (docs/api/openapi.yaml). */
export interface ExpenseNoteDto {
  id: string
  userId: string
  amount: number
  expenseDate: string
  description: string
  receiptKey: string
  status: ExpenseNoteStatus
  createdAt: string
}

export function presentExpenseNote(note: ExpenseNote): ExpenseNoteDto {
  const { id, userId, amount, expenseDate, description, receiptKey, status, createdAt } = note.toJSON()
  if (!createdAt) throw new Error(`Note ${id} sans date de création`)
  return { id, userId, amount, expenseDate, description, receiptKey, status, createdAt }
}
