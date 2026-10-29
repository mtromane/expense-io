import type { Actor } from '@/modules/shared/domain'
import { approvalScopeOf } from '../domain/ApprovalPolicy'
import type { ApprovalQueue, PendingNote } from '../ports/ApprovalQueue'

/** Notes en attente du périmètre avec le nom de leur auteur (D20, MET-08) ; rien pour un non-valideur. */
export function makeListApprovalQueue(deps: { queue: ApprovalQueue }) {
  return async (actor: Actor): Promise<PendingNote[]> => {
    const scope = approvalScopeOf(actor)
    if (!scope) return []
    return deps.queue.listPending(actor.id, scope)
  }
}
