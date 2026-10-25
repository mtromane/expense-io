import type { ExpenseNote } from '@/domain/ExpenseNote'
import type { Actor } from '@/modules/shared/domain'
import { approvalScopeOf } from '../domain/ApprovalPolicy'
import type { ApprovalTransaction } from '../ports/ApprovalRepository'

export function makeListPendingNotes(deps: { transaction: ApprovalTransaction }) {
  return async (actor: Actor): Promise<ExpenseNote[]> => {
    const scope = approvalScopeOf(actor)
    if (!scope) return []
    return deps.transaction.run(actor.id, (approvals) => approvals.listPending(scope))
  }
}
