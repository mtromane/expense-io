/** Taille maximale d'un reçu, à la création d'une note comme pour la suggestion OCR. */
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024
export const RECEIPT_TOO_LARGE = 'File too large'

/** Fichier reçu par la couche HTTP ; son contenu n'est lu qu'après le contrôle de taille. */
export interface IncomingReceipt {
  declaredType: string
  size: number
  read(): Promise<Uint8Array>
}
