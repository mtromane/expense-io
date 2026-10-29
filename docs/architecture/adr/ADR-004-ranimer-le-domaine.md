# ADR-004 · Ranimer `src/domain`, `src/ports`, `src/adapters`

* Statut : Acceptée par l'équipe le 2026-10-28
* Décision source : D4 (inverse la piste « supprimer » de `V-01`)

## Contexte
`ExpenseNote`, `User`, deux ports et deux adapters existaient sans être importés par aucune route (`V-01`) : bonne terminologie, métier toujours couplé à l'infrastructure. Les tests unitaires figent l'API de `ExpenseNote` et `User`.

## Décision
Garder ces fichiers et les brancher : `ExpenseNote.approve()` / `reject()` portent la règle « seule une note en attente se tranche » pour les 4 routes de décision ; `ReceiptStoragePort` devient le port de stockage des reçus.

## Alternatives
* Supprimer : moins de code, mais casse les unitaires et réécrit presque le même code.

## Conséquences
* Le message du domaine (« Cette note a déjà été tranchée. ») est traduit en `409 Already decided` par la couche HTTP : le contrat ne change pas.
* `src/domain` reste à sa place (chemin figé par les unitaires) et sert de noyau partagé aux modules.
