import type { ExpenseNote } from '@/domain/ExpenseNote'
import type { NewExpenseNoteFields } from '../domain/ExpenseNoteInput'
import type { SortOrder } from '../domain/SortOrder'

/** Notes de l'auteur, toujours bornées à lui-même. */
export interface ExpenseNoteRepository {
  listByOwner(ownerId: string, sort: SortOrder): Promise<ExpenseNote[]>
  insert(ownerId: string, fields: NewExpenseNoteFields, receiptKey: string): Promise<ExpenseNote>
  findReceiptKey(ownerId: string, noteId: string): Promise<string | null>
}

/** Frontière de transaction : le travail s'exécute dans le contexte de l'auteur. */
export interface ExpenseTransaction {
  run<T>(actorId: string, work: (notes: ExpenseNoteRepository) => Promise<T>): Promise<T>
}
