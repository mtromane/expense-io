# ADR-013 · Les notes d'une RH sont validées par le manager auquel elle est rattachée

* Statut : Acceptée par l'équipe le 2026-10-28
* Décision source : D13 (`M-01.1` ; défaut `MET-03`)

## Contexte
Une entreprise n'a qu'une RH. Ses notes n'étaient validables par personne : elle ne peut pas se valider elle-même, et l'annuaire ne permettait pas de la rattacher à un manager.

## Décision
La RH peut se rattacher à un manager de son entreprise (`PUT /api/hr/users/{son id}/manager`, menu « Validation de mes notes de frais » dans la console RH ; sa fiche est lue par `GET /api/hr/me`). Ce manager voit et tranche ses notes comme celles d'un employé rattaché : la règle `ApprovalPolicy` « rattachés directs » s'applique sans exception. Une RH ne valide jamais ses propres notes. Pas de seconde RH (D14 se limite à employé ↔ manager).

## Alternatives
* Une autre RH : impose de pouvoir nommer plusieurs RH ; écarté pour l'instant.
* Interdire la soumission aux RH : retire une fonctionnalité.

## Conséquences
* Aucune nouvelle règle de validation : le circuit existant suffit.
* Sans manager rattaché, les notes d'une RH restent en attente : la console RH l'indique.
* L'annuaire `GET /api/hr/users` ne liste toujours que les employés et managers (contrat et écrans inchangés).
