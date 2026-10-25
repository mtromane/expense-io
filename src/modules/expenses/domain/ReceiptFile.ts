import { InvalidInputError } from '@/modules/shared/domain'

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024
export const RECEIPT_TOO_LARGE = 'Fichier trop volumineux'
export const RECEIPT_TYPE_REFUSED = 'Type de fichier non autorisé pour le reçu'

export type ReceiptType = 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf'

export const EXTENSION_BY_TYPE: Record<ReceiptType, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
}

export function isReceiptType(value: string): value is ReceiptType {
  return value in EXTENSION_BY_TYPE
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, i) => bytes[offset + i] === byte)
}

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0))

/** Type réel d'après la signature du contenu (« magic bytes »), jamais d'après le client. */
export function detectReceiptType(bytes: Uint8Array): ReceiptType | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'image/webp'
  if (startsWith(bytes, ascii('%PDF-'))) return 'application/pdf'
  return null
}

/** Le type déclaré doit être autorisé et correspondre au contenu réel (SEC-07). */
export function assertReceiptContent(declaredType: ReceiptType, bytes: Uint8Array): void {
  if (detectReceiptType(bytes) !== declaredType) throw new InvalidInputError(RECEIPT_TYPE_REFUSED)
}
