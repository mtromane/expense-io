import type { ExpenseNote } from '@/domain/ExpenseNote'
import { InvalidInputError, type Actor } from '@/modules/shared/domain'
import type { ReceiptStoragePort } from '@/ports/ReceiptStoragePort'
import { parseNewExpenseNote } from '../domain/ExpenseNoteInput'
import {
  assertReceiptContent,
  EXTENSION_BY_TYPE,
  isReceiptType,
  MAX_RECEIPT_BYTES,
  RECEIPT_TOO_LARGE,
  RECEIPT_TYPE_REFUSED,
} from '../domain/ReceiptFile'
import type { ExpenseTransaction } from '../ports/ExpenseNoteRepository'

/** Reçu tel que reçu par la couche HTTP ; le contenu n'est lu qu'après les contrôles de taille. */
export interface IncomingReceipt {
  declaredType: string
  size: number
  read(): Promise<Uint8Array>
}

export interface SubmitExpenseNoteCommand {
  actor: Actor
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
  onCompensationFailure?: (key: string, error: unknown) => void
}

/**
 * Crée une note et son reçu. Le reçu est téléversé d'abord, sous une clé
 * opaque, puis la note est insérée ; si l'insertion échoue, le reçu est
 * supprimé (compensation) : jamais de note sans reçu (ROB-01).
 */
export function makeSubmitExpenseNote(deps: SubmitDeps) {
  return async (command: SubmitExpenseNoteCommand): Promise<ExpenseNote> => {
    const fields = parseNewExpenseNote(command)
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
