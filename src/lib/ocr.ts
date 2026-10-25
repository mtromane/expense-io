/**
 * Point d'entrée historique de l'OCR, conservé pour ses appelants et ses
 * tests unitaires : la logique vit dans le module receipt-scan.
 */
export type { Suggestion as ExpenseNoteSuggestion } from '@/modules/receipt-scan'
export { suggestFromImage as suggestFields } from '@/modules/receipt-scan'
