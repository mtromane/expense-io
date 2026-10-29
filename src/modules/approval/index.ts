/**
 * Module approval : validation des notes de frais (listes des valideurs,
 * décision, reçu côté valideur). API publique et assemblage des adapters.
 */
import { S3ReceiptAdapter } from '@/adapters/S3ReceiptAdapter'
import { makeDecideExpenseNote } from './application/decideExpenseNote'
import { makeGetReceiptUrlForApprover } from './application/getReceiptUrlForApprover'
import { makeListApprovalQueue } from './application/listApprovalQueue'
import { makeListPendingNotes } from './application/listPendingNotes'
import { pgApprovalQueue, pgApprovalTransaction } from './infrastructure/PgApprovalRepository'

export { ALREADY_DECIDED, type Decision } from './application/decideExpenseNote'
export type { PendingNote } from './ports/ApprovalQueue'

const transaction = pgApprovalTransaction

export const listPendingNotes = makeListPendingNotes({ transaction })
export const listApprovalQueue = makeListApprovalQueue({ queue: pgApprovalQueue })
export const decideExpenseNote = makeDecideExpenseNote({ transaction })
export const getReceiptUrlForApprover = makeGetReceiptUrlForApprover({ transaction, receipts: new S3ReceiptAdapter() })
