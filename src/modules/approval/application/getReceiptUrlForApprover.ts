import type { Actor } from '@/modules/shared/domain'
import { NotFoundError } from '@/modules/shared/domain'
import type { ReceiptStoragePort } from '@/ports/ReceiptStoragePort'
import { approvalScopeOf } from '../domain/ApprovalPolicy'
import type { ApprovalTransaction } from '../ports/ApprovalRepository'

/**
 * URL du reçu d'une note, pour un valideur : même périmètre que la décision
 * (SEC-02 : un manager ne lit plus le reçu d'une note hors de son équipe).
 */
export function makeGetReceiptUrlForApprover(deps: { transaction: ApprovalTransaction; receipts: ReceiptStoragePort }) {
  return async (actor: Actor, noteId: string): Promise<string> => {
    const scope = approvalScopeOf(actor)
    if (!scope) throw new NotFoundError()
    const note = await deps.transaction.run(actor.id, (approvals) => approvals.findInScope(scope, noteId))
    if (!note) throw new NotFoundError()
    return deps.receipts.getSignedUrl(note.toJSON().receiptKey)
  }
}
