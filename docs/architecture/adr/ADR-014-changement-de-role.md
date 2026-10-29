# ADR-014 · Changement de rôle par une route RH, seconde RH comprise

* Statut : Acceptée par l'équipe le 2026-10-28
* Décision source : D14 (`M-02`, `M-08`, `V-19` ; défauts `ROLE-01` à `ROLE-07`)

## Contexte
Le rôle manager n'était attribuable que par le seed ou en SQL : une entreprise créée par inscription n'avait jamais de circuit de validation. La réunion d'équipe du 2026-10-28 a validé la route de changement de rôle, avec un ajout : une RH peut nommer une autre RH (et donc valider ses notes, ADR-013).

## Décision
* Route `PUT /api/hr/users/:id/role` (`{ "role": "employee" | "manager" | "hr_admin" }`), réservée à la RH et bornée à son entreprise (un membre d'une autre entreprise → `404`). Boutons « Nommer manager », « Rétrograder en employé » et « Nommer RH » dans l'organigramme de la console ; section « Équipe RH » listant les RH (`GET /api/hr/admins`) avec « Rétrograder en employé ». Aucune route existante ne change ; la contrainte `CHECK` de `users.role` autorisait déjà `hr_admin` : aucune migration de schéma.
* Règles, dans `organization` (`changeRole`), toutes en `409` :
  * **une RH ne change jamais son propre rôle** : `Cannot change own role`. Le `409` est le code des conflits avec l'état de l'organigramme, déjà utilisé pour l'auto-rattachement (`Invalid manager`, ADR-018) ; le `403` reste réservé à la garde `route()` (rôle insuffisant, ADR-012), alors qu'ici la RH a bien le rôle requis ;
  * **une entreprise garde toujours au moins une RH** : rétrograder la dernière RH est refusé, `Last HR admin` ;
  * **un manager qui a encore des subordonnés ne cesse pas d'être manager**, ni employé ni RH : `Manager has direct reports` (leurs notes n'auraient plus de valideur, M-08) ;
  * un manager sans manager peut être rétrogradé : employé sans manager, ses notes vont à la RH (`MET-02`).
* Les changements de rôle et les rattachements s'exécutent dans une transaction verrouillée par entreprise (`pg_advisory_xact_lock`) : vérifications et écriture ne se croisent jamais. Deux RH qui se rétrogradent l'une l'autre en même temps : la seconde demande voit qu'il ne resterait plus de RH (`409 Last HR admin`), ou est refusée par la garde si son auteur n'est déjà plus RH (`403`). L'entreprise garde toujours une RH (test de concurrence ROLE-06).
* Le rôle est relu en base pour tout contrôle de rôle (`identity.getActor` : routes `/api/manager/*`, `/api/hr/*`, pages `/manager`, `/hr`, menu), et non pris dans le jeton de session (`V-19`) : une promotion ou une rétrogradation, RH comprise, prend effet immédiatement, sans reconnexion. Les routes sans rôle exigé n'utilisent que l'identifiant du jeton, sans requête (`identity.getSessionActor`).

## Alternatives
* Étendre `PUT .../manager` : change le contrat d'une route existante et mélange deux intentions.
* Promotion implicite au premier rattachement : surprenant, et pas de rétrogradation possible.
* Détacher les subordonnés à la rétrogradation : leurs notes en attente changeraient de valideur sans que la RH l'ait voulu.
* Lister les RH dans `GET /api/hr/users` : change la réponse d'une route existante (schéma strict, tests de parité, écran « Organigramme ») ; une route dédiée `GET /api/hr/admins` est l'ajout le moins intrusif.
* `403` pour le changement de son propre rôle : mélangerait un refus métier avec le contrôle d'accès de `route()`.

## Conséquences
* Une requête SQL de plus (lecture du rôle par clé primaire) seulement sur les routes et pages à rôle, mémorisée par rendu pour les pages (`cache()` de React, `src/app/current-user.ts`) ; aucune sur les routes employé. Coût mesuré par `make test-perf`.
* Rétrogradation et rattachement simultanés, ou deux rétrogradations de RH simultanées : jamais les deux acceptés (tests de concurrence ROLE-02 et ROLE-06).
* Sur les routes et pages à rôle, un utilisateur supprimé ou d'un rôle inconnu perd l'accès immédiatement. Les routes sans rôle exigé se fient au jeton seul, comme l'application d'origine (l'application ne permet pas de supprimer un compte).
