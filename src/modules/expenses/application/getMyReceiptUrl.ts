import { NotFoundError, type Actor } from '@/modules/shared/domain'
import type { ReceiptStoragePort } from '@/ports/ReceiptStoragePort'
import type { ExpenseTransaction } from '../ports/ExpenseNoteRepository'

export function makeGetMyReceiptUrl(deps: { transaction: ExpenseTransaction; receipts: ReceiptStoragePort }) {
  return async (actor: Actor, noteId: string): Promise<string> => {
    const key = await deps.transaction.run(actor.id, (notes) => notes.findReceiptKey(actor.id, noteId))
    if (key === null) throw new NotFoundError()
    return deps.receipts.getSignedUrl(key)
  }
}
