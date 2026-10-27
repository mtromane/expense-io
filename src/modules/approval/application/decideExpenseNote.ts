import { NoteAlreadyDecidedError, type ExpenseNote } from '@/domain/ExpenseNote'
import { ConflictError, NotFoundError, type Actor } from '@/modules/shared/domain'
import { approvalScopeOf } from '../domain/ApprovalPolicy'
import type { ApprovalTransaction } from '../ports/ApprovalRepository'

export type Decision = 'approve' | 'reject'

export interface DecideCommand {
  actor: Actor
  noteId: string
  decision: Decision
}

/** Message du contrat quand une note est déjà tranchée. */
export const ALREADY_DECIDED = 'Already decided'

/**
 * Approuve ou rejette une note du périmètre du valideur. La règle « seule une
 * note en attente se tranche » est celle du domaine ; l'écriture conditionnée
 * au statut garantit qu'une seule décision gagne en cas de concurrence (ROB-02).
 */
export function makeDecideExpenseNote(deps: { transaction: ApprovalTransaction }) {
  return async ({ actor, noteId, decision }: DecideCommand): Promise<ExpenseNote> => {
    const scope = approvalScopeOf(actor)
    if (!scope) throw new NotFoundError()
    return deps.transaction.run(actor.id, async (approvals) => {
      const note = await approvals.findInScope(scope, noteId)
      if (!note) throw new NotFoundError()
      let decided: ExpenseNote
      try {
        decided = decision === 'approve' ? note.approve() : note.reject()
      } catch (error) {
        if (error instanceof NoteAlreadyDecidedError) throw new ConflictError(ALREADY_DECIDED)
        throw error
      }
      const saved = await approvals.saveDecision(decided)
      if (!saved) throw new ConflictError(ALREADY_DECIDED)
      return saved
    })
  }
}
