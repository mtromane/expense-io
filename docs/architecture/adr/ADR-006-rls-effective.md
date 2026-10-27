# ADR-006 · Rendre la RLS effective

* Statut : Proposée, à valider par l'équipe
* Décision source : D6 (défaut `SEC-09`)

## Contexte
Les policies RLS existent, mais l'application se connecte en superuser : elles ne s'appliquent jamais (`V-05.1`). L'isolation entre utilisateurs et entreprises repose sur les seuls `WHERE` écrits à la main.

## Décision
Dans chaque transaction scopée (`withUserScope`), passer sur un rôle sans privilège (`set_config('role', APP_DB_ROLE, true)`, équivalent de `SET LOCAL ROLE`), dans la même instruction que le contexte utilisateur. `DATABASE_URL` est inchangée. Le rôle est créé par une nouvelle migration ; son nom est donné par la nouvelle variable `APP_DB_ROLE` (valeur par défaut dans `.env.example`). Les policies sont complétées (RH limitée à son entreprise) et écrites avec des sous-requêtes non corrélées, donc indexables.

## Alternatives
* Retirer la RLS : plus simple, mais l'isolation repose à nouveau sur le seul code, ce que le cours déconseille ; argument faible sur le multitenant.

## Conséquences
* Une requête oubliée ne fuit plus : défense en profondeur avec les repositories scopés.
* Coût par requête à mesurer (`make test-perf`) ; aucune requête supplémentaire grâce au `set_config` groupé.
* Les scripts de seed écrivent toujours en superuser.
