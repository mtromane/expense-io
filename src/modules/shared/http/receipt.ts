import { MAX_RECEIPT_BYTES, RECEIPT_TOO_LARGE, InvalidInputError, type IncomingReceipt } from '../domain'

/** Marge pour les en-têtes multipart et les autres champs du formulaire. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024
const MAX_BODY_BYTES = MAX_RECEIPT_BYTES + MULTIPART_OVERHEAD_BYTES

/**
 * Flux du corps plafonné : chaque morceau est compté au passage et transmis
 * tel quel (aucune mise en mémoire de notre côté) ; au-delà de la limite, le
 * flux est mis en erreur et la lecture de la requête s'arrête. Ne dépend pas
 * de Content-Length, absent d'une requête en Transfer-Encoding: chunked (SEC-08).
 */
function capped(body: ReadableStream<Uint8Array>, maxBytes: number, onExceeded: () => void): ReadableStream<Uint8Array> {
  let total = 0
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        total += chunk.byteLength
        if (total > maxBytes) {
          onExceeded()
          controller.error(new InvalidInputError(RECEIPT_TOO_LARGE))
        } else {
          controller.enqueue(chunk)
        }
      },
    })
  )
}

/**
 * Formulaire d'une requête portant un reçu, sans jamais lire plus que la
 * limite : refus immédiat si Content-Length l'annonce trop gros, sinon lecture
 * plafonnée du flux, décodée directement (pas de copie intermédiaire). La
 * taille exacte du fichier est revérifiée par le cas d'usage.
 */
export async function readReceiptForm(request: Request): Promise<FormData> {
  const declared = request.headers.get('content-length')
  if (declared !== null && !(Number(declared) <= MAX_BODY_BYTES)) throw new InvalidInputError(RECEIPT_TOO_LARGE)
  const headers = new Headers()
  const contentType = request.headers.get('content-type')
  if (contentType) headers.set('content-type', contentType)
  if (!request.body) return new Response(null, { headers }).formData()
  let exceeded = false
  try {
    return await new Response(capped(request.body, MAX_BODY_BYTES, () => (exceeded = true)), { headers }).formData()
  } catch (error) {
    // L'erreur du flux peut arriver enveloppée par le décodeur : la cause réelle est le dépassement.
    if (exceeded) throw new InvalidInputError(RECEIPT_TOO_LARGE)
    throw error
  }
}

/** Champ `receipt` d'un formulaire, lu seulement à la demande. */
export function receiptFrom(value: FormDataEntryValue | null): IncomingReceipt | null {
  if (!(value instanceof File)) return null
  return { declaredType: value.type, size: value.size, read: async () => new Uint8Array(await value.arrayBuffer()) }
}
