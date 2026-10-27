# ADR-007 · `company_id` sur `expense_notes`, rempli par trigger

* Statut : Proposée, à valider par l'équipe
* Décision source : D7

## Contexte
L'entreprise d'une note est retrouvée par jointure sur `users`, recopiée dans les requêtes RH. Les policies RLS par entreprise demandent alors des sous-requêtes.

## Décision
Ajouter `expense_notes.company_id`, rempli par un trigger `BEFORE INSERT` à partir de l'auteur, dans une nouvelle migration (la migration initiale n'est pas modifiée). Les tables `users` et `companies` ne changent pas.

## Alternatives
* Rempli par l'application : casse `scripts/seed.mjs` et `scripts/seed-perf.mjs` (colonne absente de leurs `INSERT`), or `seed-perf` doit rester compatible avec la baseline.
* Ne rien ajouter : filtres d'entreprise par jointure partout.

## Conséquences
* Index direct par entreprise (`PERF-02`) et policy RH simple.
* Dénormalisation : un utilisateur ne change jamais d'entreprise aujourd'hui ; à verrouiller si cela devenait possible.
* Logique dans un trigger : documentée ici et dans la migration.
