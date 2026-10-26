# Module `receipt-scan`

Suggestion du montant et de la date d'un reçu par OCR. Le traitement est synchrone et borné, sans file de messages (ADR-008).

| Couche | Fichier | Rôle |
|---|---|---|
| domain | `Suggestion.ts` | extraction du montant et de la date depuis le texte reconnu ; types d'image acceptés |
| application | `suggestFromReceipt.ts` | taille bornée (SEC-08) ; un échec de l'OCR donne une suggestion vide, journalisée (`ocr.failed`) |
| ports | `ReceiptScanner.ts` | `recognizeText(image)` |
| infrastructure | `TesseractWorkerPool.ts` | workers Tesseract réutilisés (au plus 4), délai de 20 s par reconnaissance (PERF-01) |

API publique : `suggestFromReceipt`, `suggestFromImage`, type `Suggestion`.

Route : `POST /api/expense-notes/receipt-suggestion`. La sortie sur les reçus de référence (`tests/fixtures/ocr/`) fait partie du contrat.

Tests : `tests/unit/modules/receipt-scan.test.ts`, `tests/unit/ocr.test.ts`.
