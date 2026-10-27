import { ExpenseNote, type ExpenseNoteStatus } from '@/domain/ExpenseNote'

/** Ligne `expense_notes` telle que renvoyée par PostgreSQL (date gardée en `YYYY-MM-DD`). */
export interface ExpenseNoteRecord {
  id: string
  user_id: string
  amount: string
  expense_date: string
  description: string
  receipt_key: string
  status: ExpenseNoteStatus
  created_at: string | Date
}

export function toExpenseNote(row: ExpenseNoteRecord): ExpenseNote {
  return new ExpenseNote({
    id: row.id,
    userId: row.user_id,
    amount: Number.parseFloat(row.amount),
    expenseDate: row.expense_date,
    description: row.description,
    receiptKey: row.receipt_key,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
  })
}
