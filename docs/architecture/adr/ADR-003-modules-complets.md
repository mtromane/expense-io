# ADR-003 · Refacto par modules complets

* Statut : Acceptée par l'équipe le 2026-10-28
* Décision source : D3

## Contexte
Les 17 défauts techniques peuvent se corriger dans les routes, sans architecture. Mais les doublons resteraient (4 routes de décision quasi identiques, 7 mappings JSON, 14 contrôles de rôle recopiés) et le live coding se ferait dans un code sans règles.

## Décision
Migrer tous les endpoints vers des modules en Clean Architecture légère (domaine, cas d'usage, ports, adapters), par étapes « strangler », en corrigeant chaque défaut **en passant par** la nouvelle architecture.

## Alternatives
* Strict nécessaire : rapide, mais aucun principe démontré.
* Intermédiaire (`approval` et `expenses` seulement) : temps maîtrisé, mais deux façons d'écrire une route à la soutenance.

## Conséquences
* Une étape = un commit vert (parité, contrat, unitaires).
* Règle de performance : un cas d'usage ne fait pas plus d'allers-retours SQL que la route qu'il remplace.
