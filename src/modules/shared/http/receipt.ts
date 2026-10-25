import { MAX_RECEIPT_BYTES, RECEIPT_TOO_LARGE, InvalidInputError, type IncomingReceipt } from '../domain'

/** Marge pour les en-têtes multipart et les autres champs du formulaire. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024

/**
 * Refuse un corps manifestement trop gros d'après Content-Length, avant de
 * décoder le formulaire (la taille exacte du fichier est revérifiée ensuite).
 */
export function assertBodyFitsReceipt(request: Request): void {
  const length = Number(request.headers.get('content-length'))
  if (length > MAX_RECEIPT_BYTES + MULTIPART_OVERHEAD_BYTES) throw new InvalidInputError(RECEIPT_TOO_LARGE)
}

/** Champ `receipt` d'un formulaire, lu seulement à la demande. */
export function receiptFrom(value: FormDataEntryValue | null): IncomingReceipt | null {
  if (!(value instanceof File)) return null
  return { declaredType: value.type, size: value.size, read: async () => new Uint8Array(await value.arrayBuffer()) }
}
