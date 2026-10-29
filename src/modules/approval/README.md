# Module `approval`

Qui voit et tranche quelle note, et la décision elle-même.

| Couche | Fichier | Rôle |
|---|---|---|
| domain | `ApprovalPolicy.ts` | **la** règle de périmètre : un manager voit les notes de ses rattachés directs, une RH celles des managers, des employés (MET-02) **et des autres RH** (MET-10) sans manager de son entreprise : aucune note sans valideur, jamais les siennes |
| application | `listPendingNotes.ts` | notes en attente du périmètre, par date de création croissante (liste RH) |
| application | `listApprovalQueue.ts` | même file, avec le nom de l'auteur de chaque note (liste manager, D20, MET-08) |
| application | `decideExpenseNote.ts` | approuve ou rejette ; note hors périmètre → `404`, déjà tranchée → `409 Already decided` |
| application | `getReceiptUrlForApprover.ts` | reçu d'une note du périmètre (SEC-02) |
| ports | `ApprovalRepository.ts` | `ApprovalTransaction.run(actorId, …)` ; `saveDecision` n'écrit que si la note est encore `pending` |
| ports | `ApprovalQueue.ts` | file d'un valideur avec le nom des auteurs (`PendingNote`), lue en une requête |
| infrastructure | `PgApprovalRepository.ts` | Postgres via `withUserScope` (RLS effective) ; `pgApprovalQueue` lit les auteurs du périmètre une fois (CTE) puis les joint aux notes |

La transition `pending → approved | rejected` est portée par l'entité `ExpenseNote` (`src/domain`, ADR-004). L'écriture est conditionnée au statut (verrou optimiste) : sur 20 décisions simultanées, une seule gagne (ROB-02).

API publique : `listPendingNotes`, `listApprovalQueue`, `decideExpenseNote`, `getReceiptUrlForApprover`, `ALREADY_DECIDED`, type `PendingNote`.

Routes : `/api/manager/expense-notes[/:id/approve|reject|receipt-url]` et leurs équivalents `/api/hr/...`.

Tests : `tests/unit/modules/approval.test.ts`, `tests/unit/modules/approval-nom-auteur.test.ts`.
