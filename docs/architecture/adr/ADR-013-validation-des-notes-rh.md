# ADR-013 · Les notes d'une RH sont validées par son manager, sinon par une autre RH

* Statut : Acceptée par l'équipe le 2026-10-28
* Décision source : D13 (`M-01.1` ; défauts `MET-03`, `MET-10`)

## Contexte
Une RH ne peut pas valider ses propres notes. À l'origine, ses notes n'étaient validables par personne : l'annuaire ne permettait pas de la rattacher à un manager, et une entreprise ne pouvait avoir qu'une RH. Depuis la réunion du 2026-10-28, une RH peut en nommer une autre (ADR-014) : la recommandation de l'audit, « rattachement à un manager, avec autre RH ajouté si M-02 permet de nommer plusieurs RH », peut donc être appliquée en entier.

## Décision
Les notes d'une RH sont validées, dans cet ordre :
1. par le manager auquel elle est rattachée, comme celles d'un employé rattaché (`PUT /api/hr/users/{son id}/manager`, menu « Validation de mes notes de frais » de la console ; sa fiche est lue par `GET /api/hr/me`) ;
2. sinon, par n'importe quelle autre RH de son entreprise : le périmètre RH de `ApprovalPolicy` (`company-without-manager`) couvre toutes les personnes sans manager de l'entreprise, managers, employés et RH, sauf la RH courante ;
3. jamais par elle-même.

Sans manager et sans autre RH, ses notes restent en attente ; la console l'indique (texte existant), et indique dans le cas contraire qu'une autre RH les valide (texte ajouté).

Le périmètre est appliqué deux fois, comme les autres (ADR-006) : dans la requête du dépôt et dans les policies RLS RH, redéfinies par la migration `1761696000000_met10-rh-validee-par-autre-rh.sql` (sous-requêtes non corrélées, donc indexables ; les migrations existantes ne sont pas modifiées).

## Alternatives
* Rattachement à un manager seulement (choix du 2026-10-26) : une RH sans manager reste sans valideur alors qu'une autre RH pourrait trancher.
* Une autre RH seulement : obligerait chaque entreprise à avoir deux RH.
* Interdire la soumission aux RH : retire une fonctionnalité.

## Conséquences
* Aucune nouvelle notion : la même file RH sert aux managers racine, aux employés sans manager (MET-02) et aux autres RH sans manager (MET-10).
* L'annuaire `GET /api/hr/users` ne liste toujours que les employés et managers (contrat et écrans inchangés) ; les RH sont listées par `GET /api/hr/admins` (ADR-014).
* Une RH rattachée à un manager n'apparaît pas dans la file des autres RH : son manager reste son seul valideur.
