/**
 * Module receipt-scan : suggestion de montant et de date par OCR, synchrone
 * et bornée (pas de file de messages : ADR-008). API publique et assemblage.
 */
import { log } from '@/modules/shared/infrastructure/logger'
import { makeSuggestFromImage, makeSuggestFromReceipt, type SuggestDeps } from './application/suggestFromReceipt'
import { TesseractWorkerPool } from './infrastructure/TesseractWorkerPool'

export type { Suggestion } from './domain/Suggestion'

const deps: SuggestDeps = {
  scanner: new TesseractWorkerPool(),
  onScanFailure: (error) =>
    log('error', 'ocr.failed', { error: error instanceof Error ? error.message : String(error) }),
}

export const suggestFromReceipt = makeSuggestFromReceipt(deps)
export const suggestFromImage = makeSuggestFromImage(deps)
