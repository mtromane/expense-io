/** Moteur de reconnaissance de texte sur une image de reçu. */
export interface ReceiptScanner {
  recognizeText(image: Buffer): Promise<string>
}
