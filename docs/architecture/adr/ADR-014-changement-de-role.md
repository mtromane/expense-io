# ADR-014 · Changement de rôle par une nouvelle route RH

* Statut : Acceptée (équipe, 2026-10-26)
* Décision source : D14 (`M-02`, `M-08`, `V-19` ; défauts `ROLE-01` à `ROLE-03`)

## Contexte
Le rôle manager n'était attribuable que par le seed ou en SQL : une entreprise créée par inscription n'avait jamais de circuit de validation.

## Décision
* Nouvelle route `PUT /api/hr/users/:id/role` (`{ "role": "employee" | "manager" }`), réservée à la RH, bornée à son entreprise, et menu de rôle dans la console RH. Aucune route existante ne change.
* Rétrograder un manager qui a encore des subordonnés est refusé : `409 {"error":"Manager has direct reports"}`. La RH réaffecte d'abord ses subordonnés.
* Le rôle est relu en base à chaque requête (`identity.getActor`), et non plus pris dans le jeton de session (`V-19`) : une promotion ou une rétrogradation prend effet immédiatement, sans reconnexion.

## Alternatives
* Étendre `PUT .../manager` : change le contrat d'une route existante et mélange deux intentions.
* Promotion implicite au premier rattachement : surprenant, et pas de rétrogradation possible.
* Détacher les subordonnés à la rétrogradation : leurs notes en attente changeraient de valideur sans que la RH l'ait voulu.

## Conséquences
* Une requête SQL de plus par requête authentifiée (lecture du rôle par clé primaire) : coût mesuré par `make test-perf`.
* Rétrogradation et rattachement simultanés : le changement de rôle et le rattachement s'exécutent dans une transaction verrouillée par entreprise (`pg_advisory_xact_lock`) ; l'un des deux est refusé, jamais les deux acceptés (test de concurrence ROLE-02).
* Un utilisateur supprimé ou d'un rôle inconnu perd l'accès immédiatement.
