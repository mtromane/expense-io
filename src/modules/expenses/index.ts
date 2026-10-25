/**
 * Module expenses : soumission et consultation de ses propres notes de frais
 * et de leurs reçus. API publique et assemblage des adapters.
 */
import { S3ReceiptAdapter } from '@/adapters/S3ReceiptAdapter'
import { log } from '@/modules/shared/infrastructure/logger'
import { makeGetMyReceiptUrl } from './application/getMyReceiptUrl'
import { makeListMyExpenseNotes } from './application/listMyExpenseNotes'
import { makeSubmitExpenseNote } from './application/submitExpenseNote'
import { pgExpenseTransaction } from './infrastructure/PgExpenseNoteRepository'

const transaction = pgExpenseTransaction
const receipts = new S3ReceiptAdapter()

export const listMyExpenseNotes = makeListMyExpenseNotes({ transaction })
export const getMyReceiptUrl = makeGetMyReceiptUrl({ transaction, receipts })
export const submitExpenseNote = makeSubmitExpenseNote({
  transaction,
  receipts,
  newId: () => crypto.randomUUID(),
  onCompensationFailure: (key, error) =>
    log('error', 'receipt.orphaned', { key, error: error instanceof Error ? error.message : String(error) }),
})
