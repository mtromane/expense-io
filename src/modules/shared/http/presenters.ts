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

/** Note de la file d'un manager (GET /api/manager/expense-notes) : avec le nom de son auteur (D20, MET-08). */
export interface PendingExpenseNoteDto extends ExpenseNoteDto {
  authorName: string
}

export function presentPendingNote({ note, authorName }: { note: ExpenseNote; authorName: string }): PendingExpenseNoteDto {
  return { ...presentExpenseNote(note), authorName }
}

/** Employé ou manager de l'annuaire RH (GET /api/hr/users). */
export interface CompanyUserDto {
  id: string
  name: string
  email: string
  role: 'employee' | 'manager'
  managerId: string | null
}

/** Fiche de la RH connectée (GET /api/hr/me) : son manager valide ses notes (D13). */
export interface HrUserDto {
  id: string
  name: string
  email: string
  role: 'hr_admin'
  managerId: string | null
}

/** Suggestion OCR : champs absents quand rien n'est reconnu. */
export interface SuggestionDto {
  amount?: number
  expenseDate?: string
}

/** URL signée d'un reçu. */
export interface ReceiptUrlDto {
  url: string
}
