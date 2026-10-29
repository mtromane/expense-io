import type { ExpenseNote } from '@/domain/ExpenseNote'
import {
  InvalidInputError,
  MAX_RECEIPT_BYTES,
  RECEIPT_TOO_LARGE,
  type Identified,
  type IncomingReceipt,
} from '@/modules/shared/domain'
import type { ReceiptStoragePort } from '@/ports/ReceiptStoragePort'
import { parseNewExpenseNote } from '../domain/ExpenseNoteInput'
import { assertReceiptContent, EXTENSION_BY_TYPE, isReceiptType, RECEIPT_TYPE_REFUSED } from '../domain/ReceiptFile'
import type { ExpenseTransaction } from '../ports/ExpenseNoteRepository'

export type { IncomingReceipt }

export interface SubmitExpenseNoteCommand {
  actor: Identified
  amount: unknown
  expenseDate: unknown
  description: unknown
  receipt: IncomingReceipt | null
}

export interface SubmitDeps {
  transaction: ExpenseTransaction
  receipts: ReceiptStoragePort
  /** Identifiant opaque de la clé du reçu (SEC-06). */
  newId: () => string
  /** Horloge : une dépense ne peut pas être datée après demain (D20, MET-06). Par défaut, l'heure courante. */
  now?: () => Date
  onCompensationFailure?: (key: string, error: unknown) => void
}

/**
 * Crée une note et son reçu. Le reçu est téléversé d'abord, sous une clé
 * opaque, puis la note est insérée ; si l'insertion échoue, le reçu est
 * supprimé (compensation) : jamais de note sans reçu (ROB-01).
 */
export function makeSubmitExpenseNote(deps: SubmitDeps) {
  return async (command: SubmitExpenseNoteCommand): Promise<ExpenseNote> => {
    const fields = parseNewExpenseNote(command, deps.now?.())
    const { receipt } = command
    if (!receipt) throw new InvalidInputError()
    if (!isReceiptType(receipt.declaredType)) throw new InvalidInputError(RECEIPT_TYPE_REFUSED)
    if (receipt.size > MAX_RECEIPT_BYTES) throw new InvalidInputError(RECEIPT_TOO_LARGE)
    const bytes = await receipt.read()
    assertReceiptContent(receipt.declaredType, bytes)

    const key = `receipts/${deps.newId()}${EXTENSION_BY_TYPE[receipt.declaredType]}`
    await deps.receipts.upload(key, Buffer.from(bytes), receipt.declaredType)
    try {
      return await deps.transaction.run(command.actor.id, (notes) => notes.insert(command.actor.id, fields, key))
    } catch (error) {
      await deps.receipts.delete(key).catch((cleanupError) => deps.onCompensationFailure?.(key, cleanupError))
      throw error
    }
  }
}
