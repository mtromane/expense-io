import { InvalidInputError, MAX_RECEIPT_BYTES, RECEIPT_TOO_LARGE, type IncomingReceipt } from '@/modules/shared/domain'
import { extractSuggestion, SCANNABLE_TYPES, type Suggestion } from '../domain/Suggestion'
import type { ReceiptScanner } from '../ports/ReceiptScanner'

export interface SuggestDeps {
  scanner: ReceiptScanner
  onScanFailure?: (error: unknown) => void
}

/** Analyse d'une image déjà lue : type non pris en charge ou échec du moteur → suggestion vide. */
export function makeSuggestFromImage(deps: SuggestDeps) {
  return async (image: { data: Buffer; mimeType: string }): Promise<Suggestion> => {
    if (!SCANNABLE_TYPES.includes(image.mimeType)) return {}
    try {
      return extractSuggestion(await deps.scanner.recognizeText(image.data))
    } catch (error) {
      deps.onScanFailure?.(error)
      return {}
    }
  }
}

/**
 * Suggestion de montant et de date pour un reçu envoyé par l'utilisateur.
 * La taille est vérifiée avant toute lecture du contenu (SEC-08).
 */
export function makeSuggestFromReceipt(deps: SuggestDeps) {
  const suggestFromImage = makeSuggestFromImage(deps)
  return async (receipt: IncomingReceipt | null): Promise<Suggestion> => {
    if (!receipt) throw new InvalidInputError()
    if (receipt.size > MAX_RECEIPT_BYTES) throw new InvalidInputError(RECEIPT_TOO_LARGE)
    const data = Buffer.from(await receipt.read())
    return suggestFromImage({ data, mimeType: receipt.declaredType })
  }
}
