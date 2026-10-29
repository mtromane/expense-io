# ADR-020 · Comportements sans arbitrage : nom de l'auteur, email sans casse, date future

* Statut : Proposée le 2026-10-29 (team Tests), à valider en revue de la PR
* Décision source : D20 (`M-06`, `V-12.3`, `M-09` ; défauts `MET-08`, `MET-05`, `MET-06`)

## Contexte
`docs/audit/22-comportements-a-corriger.md` classe ces trois comportements « arbitrage : non » : leur cible fait consensus. Mais la règle 5 d'`AGENTS.md` n'autorise que les options tranchées dans `docs/audit/21-decisions-architecture.md`, si bien qu'ils n'étaient ni au registre des défauts ni corrigés. `M-06` est coté Haute et se trouve sur le parcours le plus probable des tests du professeur (le manager valide une note « avec le nom de l'auteur »).

## Décision
* **`M-06` (`MET-08`)** : `GET /api/manager/expense-notes` gagne un champ `authorName` (ajout, aucun champ retiré) et la colonne « Employé » de la page de validation affiche ce nom. La liste est lue par une seule requête SQL : les auteurs du périmètre sont calculés une fois, puis joints aux notes (pas d'aller-retour supplémentaire).
* **`V-12.3` (`MET-05`)** : la casse de l'email est ignorée à l'inscription et à la connexion. L'unicité porte sur `lower(email)` (index unique, nouvelle migration). L'email reste stocké tel que saisi.
* **`M-09` (`MET-06`)** : une date de dépense postérieure à demain (UTC) est refusée par `400 Invalid fields`. Le jour de marge couvre tous les fuseaux horaires.

## Alternatives
* Nom de l'auteur par une route d'annuaire réservée au manager : une requête de plus côté écran, et une route de plus au contrat.
* Emails convertis en minuscules à l'écriture : l'email affiché changerait (annuaire, en-tête), et les tests unitaires existants l'attendent tel que saisi.
* Date refusée dès demain : un utilisateur en avance sur UTC (Asie, Océanie) ne pourrait plus saisir sa date du jour. Attribut `max` sur le champ date : le navigateur bloquerait l'envoi sans afficher le message de l'application.
* Ne rien corriger : `M-06` resterait le seul constat Haut ouvert du circuit de validation.

## Conséquences
* Trois défauts rouges puis verts dans `tests/defects/metier-d20.spec.ts`. Contrat : `authorName` ajouté au schéma de la liste manager, version 2.0.0 de `docs/api/openapi.yaml`.
* `tests/api/integrity.spec.ts` passe sa date de fin d'année de 2026-12-31 à 2025-12-31 : évolution voulue (règle 5), le test garde son intention (aucun décalage de fuseau).
* Risque assumé : un test caché qui soumettrait une note datée d'après-demain ou plus tard échouerait.
* Restent sans code, faute d'arbitrage : longueur maximale de la description et montants à plus de deux décimales (`MET-06`), décideur et date de décision (`M-05.1`).
