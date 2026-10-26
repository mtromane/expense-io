# Module `expenses`

Soumission et consultation de ses propres notes de frais et de leurs reçus.

| Couche | Fichier | Rôle |
|---|---|---|
| domain | `ExpenseNoteInput.ts` | validation du montant (positif, `numeric(10,2)`, ROB-03c/d) et de la date (ROB-03b) |
| domain | `ReceiptFile.ts` | types de reçu acceptés, contrôle de la signature du fichier (SEC-07) |
| domain | `SortOrder.ts` | tri par liste blanche (SEC-01), défaut `created_at DESC` |
| application | `submitExpenseNote.ts` | upload du reçu sous une clé opaque (SEC-06), puis insertion ; si l'insertion échoue, le reçu est supprimé (compensation, ROB-01) |
| application | `listMyExpenseNotes.ts`, `getMyReceiptUrl.ts` | ses notes ; URL présignée de son reçu |
| ports | `ExpenseNoteRepository.ts` | `ExpenseTransaction.run(actorId, …)` : tout accès passe par une transaction dans le contexte de l'auteur |
| infrastructure | `PgExpenseNoteRepository.ts` | Postgres via `withUserScope` (RLS effective) |

Stockage des reçus : port `ReceiptStoragePort` (`src/ports`), adapter `S3ReceiptAdapter` (`src/adapters`). Entité : `ExpenseNote` (`src/domain`).

API publique : `submitExpenseNote`, `listMyExpenseNotes`, `getMyReceiptUrl`.

Routes : `GET|POST /api/expense-notes`, `GET /api/expense-notes/:id/receipt-url`.

Tests : `tests/unit/modules/expenses.test.ts`.
