# Module `approval`

Qui voit et tranche quelle note, et la décision elle-même.

| Couche | Fichier | Rôle |
|---|---|---|
| domain | `ApprovalPolicy.ts` | **la** règle de périmètre : un manager voit les notes de ses rattachés directs, une RH celles des managers **et des employés** sans manager de son entreprise (MET-02 : aucune note sans valideur), jamais les siennes |
| application | `listPendingNotes.ts` | notes en attente du périmètre, par date de création croissante |
| application | `decideExpenseNote.ts` | approuve ou rejette ; note hors périmètre → `404`, déjà tranchée → `409 Already decided` |
| application | `getReceiptUrlForApprover.ts` | reçu d'une note du périmètre (SEC-02) |
| ports | `ApprovalRepository.ts` | `ApprovalTransaction.run(actorId, …)` ; `saveDecision` n'écrit que si la note est encore `pending` |
| infrastructure | `PgApprovalRepository.ts` | Postgres via `withUserScope` (RLS effective) |

La transition `pending → approved | rejected` est portée par l'entité `ExpenseNote` (`src/domain`, ADR-004). L'écriture est conditionnée au statut (verrou optimiste) : sur 20 décisions simultanées, une seule gagne (ROB-02).

API publique : `listPendingNotes`, `decideExpenseNote`, `getReceiptUrlForApprover`, `ALREADY_DECIDED`.

Routes : `/api/manager/expense-notes[/:id/approve|reject|receipt-url]` et leurs équivalents `/api/hr/...`.

Tests : `tests/unit/modules/approval.test.ts`.
