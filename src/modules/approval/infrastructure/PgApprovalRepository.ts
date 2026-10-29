import type { PoolClient } from 'pg'
import { ExpenseNote } from '@/domain/ExpenseNote'
import { withUserScope } from '@/modules/shared/infrastructure/db'
import { toExpenseNote, type ExpenseNoteRecord } from '@/modules/shared/infrastructure/expenseNoteRecord'
import type { ApprovalScope } from '../domain/ApprovalPolicy'
import type { ApprovalRepository, ApprovalTransaction } from '../ports/ApprovalRepository'

/**
 * Condition SQL du périmètre sur la note `en` ; `placeholder` désigne
 * l'identifiant du valideur. Les auteurs du périmètre sont calculés une fois
 * (`ARRAY(...)`), puis les notes lues par l'index (user_id, created_at) : même
 * forme que les policies RLS, sans jointure (la jointure faisait passer la
 * liste RH de 3,5 à 6 ms sur la base de perf après MET-02).
 */
function scopeCondition(scope: ApprovalScope, placeholder: string): string {
  return scope.kind === 'direct-reports'
    ? `en.user_id = ANY (ARRAY(SELECT id FROM users WHERE manager_id = ${placeholder}))`
    : `en.user_id = ANY (ARRAY(
         SELECT id FROM users
         WHERE manager_id IS NULL AND role IN ('manager', 'employee', 'hr_admin') AND id <> ${placeholder}
           AND company_id = (SELECT company_id FROM users WHERE id = ${placeholder})
       ))`
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
