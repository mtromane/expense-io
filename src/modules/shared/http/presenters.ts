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

/** Utilisateur de l'annuaire RH. */
export interface CompanyUserDto {
  id: string
  name: string
  email: string
  role: 'employee' | 'manager'
  managerId: string | null
}

/** Ligne `expense_notes` telle que renvoyée par PostgreSQL. */
export interface ExpenseNoteRow {
  id: string
  user_id: string
  amount: string
  expense_date: string
  description: string
  receipt_key: string
  status: ExpenseNoteStatus
  created_at: string | Date
}

export function presentExpenseNote(note: ExpenseNote): ExpenseNoteDto {
  const { id, userId, amount, expenseDate, description, receiptKey, status, createdAt } = note.toJSON()
  if (!createdAt) throw new Error(`Note ${id} sans date de création`)
  return { id, userId, amount, expenseDate, description, receiptKey, status, createdAt }
}

export function presentExpenseNoteRow(row: ExpenseNoteRow): ExpenseNoteDto {
  return {
    id: row.id,
    userId: row.user_id,
    amount: Number.parseFloat(row.amount),
    expenseDate: row.expense_date,
    description: row.description,
    receiptKey: row.receipt_key,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

export interface CompanyUserRow {
  id: string
  name: string
  email: string
  role: 'employee' | 'manager'
  manager_id: string | null
}

export function presentCompanyUserRow(row: CompanyUserRow): CompanyUserDto {
  return { id: row.id, name: row.name, email: row.email, role: row.role, managerId: row.manager_id }
}
