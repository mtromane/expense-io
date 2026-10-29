import type { PoolClient } from 'pg'
import { ExpenseNote } from '@/domain/ExpenseNote'
import { withUserScope } from '@/modules/shared/infrastructure/db'
import { toExpenseNote, type ExpenseNoteRecord } from '@/modules/shared/infrastructure/expenseNoteRecord'
import type { ApprovalScope } from '../domain/ApprovalPolicy'
import type { ApprovalQueue, PendingNote } from '../ports/ApprovalQueue'
import type { ApprovalRepository, ApprovalTransaction } from '../ports/ApprovalRepository'

/**
 * Auteurs du périmètre (colonnes `columns` de users) ; `placeholder` désigne
 * l'identifiant du valideur.
 */
function scopeAuthors(scope: ApprovalScope, placeholder: string, columns = 'id'): string {
  return scope.kind === 'direct-reports'
    ? `SELECT ${columns} FROM users WHERE manager_id = ${placeholder}`
    : `SELECT ${columns} FROM users
         WHERE manager_id IS NULL AND role IN ('manager', 'employee', 'hr_admin') AND id <> ${placeholder}
           AND company_id = (SELECT company_id FROM users WHERE id = ${placeholder})`
}

/**
 * Condition SQL du périmètre sur la note `en`. Les auteurs du périmètre sont
 * calculés une fois (`ARRAY(...)`), puis les notes lues par l'index
 * (user_id, created_at) : même forme que les policies RLS, sans jointure (la
 * jointure faisait passer la liste RH de 3,5 à 6 ms sur la base de perf après
 * MET-02).
 */
function scopeCondition(scope: ApprovalScope, placeholder: string): string {
  return `en.user_id = ANY (ARRAY(${scopeAuthors(scope, placeholder)}))`
}

function scopeOwner(scope: ApprovalScope): string {
  return scope.kind === 'direct-reports' ? scope.managerId : scope.hrId
}

export class PgApprovalRepository implements ApprovalRepository {
  constructor(private readonly client: PoolClient) {}

  async listPending(scope: ApprovalScope): Promise<ExpenseNote[]> {
    const result = await this.client.query<ExpenseNoteRecord>(
      `SELECT en.* FROM expense_notes en
       WHERE ${scopeCondition(scope, '$1')} AND en.status = 'pending'
       ORDER BY en.created_at ASC`,
      [scopeOwner(scope)]
    )
    return result.rows.map(toExpenseNote)
  }

  /**
   * File du valideur avec le nom des auteurs (MET-08), en une requête : les
   * auteurs du périmètre sont lus une fois (CTE), les notes toujours par
   * l'index (user_id, created_at), puis jointes à cette petite liste.
   */
  async listPendingWithAuthors(scope: ApprovalScope): Promise<PendingNote[]> {
    const result = await this.client.query<ExpenseNoteRecord & { author_name: string }>(
      `WITH authors AS MATERIALIZED (${scopeAuthors(scope, '$1', 'id, name')})
       SELECT en.*, authors.name AS author_name
       FROM expense_notes en JOIN authors ON authors.id = en.user_id
       WHERE en.user_id = ANY (ARRAY(SELECT id FROM authors)) AND en.status = 'pending'
       ORDER BY en.created_at ASC`,
      [scopeOwner(scope)]
    )
    return result.rows.map((row) => ({ note: toExpenseNote(row), authorName: row.author_name }))
  }

  async findInScope(scope: ApprovalScope, noteId: string): Promise<ExpenseNote | null> {
    const result = await this.client.query<ExpenseNoteRecord>(
      `SELECT en.* FROM expense_notes en
       WHERE en.id = $1 AND ${scopeCondition(scope, '$2')}`,
      [noteId, scopeOwner(scope)]
    )
    return result.rows[0] ? toExpenseNote(result.rows[0]) : null
  }

  async saveDecision(note: ExpenseNote): Promise<ExpenseNote | null> {
    const result = await this.client.query<ExpenseNoteRecord>(
      `UPDATE expense_notes SET status = $2
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [note.id, note.status]
    )
    return result.rows[0] ? toExpenseNote(result.rows[0]) : null
  }
}

/** Une transaction par cas d'usage, dans le contexte de l'acteur (RLS). */
export const pgApprovalTransaction: ApprovalTransaction = {
  run: (actorId, work) => withUserScope(actorId, (client) => work(new PgApprovalRepository(client))),
}

/** File d'un valideur, lue dans le contexte de l'acteur (RLS). */
export const pgApprovalQueue: ApprovalQueue = {
  listPending: (actorId, scope) =>
    withUserScope(actorId, (client) => new PgApprovalRepository(client).listPendingWithAuthors(scope)),
}
