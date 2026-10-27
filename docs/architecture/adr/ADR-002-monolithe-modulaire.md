# ADR-002 · Monolithe modulaire

* Statut : Proposée, à valider par l'équipe
* Décision source : D2

## Contexte
Une application Next.js, une base PostgreSQL, un stockage S3, une équipe étudiante, un contrat figé (routes, ports 3000 / 5433 / 4567, scripts npm). Toute la logique vit dans 13 route handlers.

## Décision
Un seul déployable Next.js découpé en modules métier sous `src/modules/` : `approval`, `organization`, `expenses`, `receipt-scan`, `identity`, et `shared` (HTTP, erreurs, base).

## Alternatives
* Microservices : contrat (une URL, des ports fixes) quasi impossible à tenir ; latence réseau entre services, donc risque de 0 au barème perf ; exploitation hors de proportion.
* Statu quo : zéro risque, mais une absence d'architecture subie, cause directe de failles (`V-06`, `V-09`).

## Conséquences
* `make dev`, ports et scripts inchangés ; aucun coût réseau ajouté.
* Les frontières entre modules ne tiennent que si elles sont vérifiées : voir ADR-005.
* Un module pourra être extrait plus tard s'il en a besoin.
