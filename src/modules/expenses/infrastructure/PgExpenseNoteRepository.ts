import type { PoolClient } from 'pg'
import type { ExpenseNote } from '@/domain/ExpenseNote'
import { withUserScope } from '@/lib/db'
import { toExpenseNote, type ExpenseNoteRecord } from '@/modules/shared/infrastructure/expenseNoteRecord'
import type { NewExpenseNoteFields } from '../domain/ExpenseNoteInput'
import type { SortOrder } from '../domain/SortOrder'
import type { ExpenseNoteRepository, ExpenseTransaction } from '../ports/ExpenseNoteRepository'

export class PgExpenseNoteRepository implements ExpenseNoteRepository {
  constructor(private readonly client: PoolClient) {}

  async listByOwner(ownerId: string, sort: SortOrder): Promise<ExpenseNote[]> {
    // Colonne et sens viennent d'une liste blanche (SortOrder), jamais de la requête brute.
    const result = await this.client.query<ExpenseNoteRecord>(
      `SELECT * FROM expense_notes WHERE user_id = $1 ORDER BY ${sort.column} ${sort.direction}`,
      [ownerId]
    )
    return result.rows.map(toExpenseNote)
  }

  async insert(ownerId: string, fields: NewExpenseNoteFields, receiptKey: string): Promise<ExpenseNote> {
    const result = await this.client.query<ExpenseNoteRecord>(
      `INSERT INTO expense_notes (user_id, amount, expense_date, description, receipt_key)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [ownerId, fields.amount, fields.expenseDate, fields.description, receiptKey]
    )
    return toExpenseNote(result.rows[0])
  }

  async findReceiptKey(ownerId: string, noteId: string): Promise<string | null> {
    const result = await this.client.query<{ receipt_key: string }>(
      'SELECT receipt_key FROM expense_notes WHERE id = $1 AND user_id = $2',
      [noteId, ownerId]
    )
    return result.rows[0]?.receipt_key ?? null
  }
}

export const pgExpenseTransaction: ExpenseTransaction = {
  run: (actorId, work) => withUserScope(actorId, (client) => work(new PgExpenseNoteRepository(client))),
}
