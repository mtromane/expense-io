# ADR-009 · Exécution du worker d'outbox (si une outbox apparaît)

* Statut : Proposée, à valider par l'équipe
* Décision source : D9 (ne s'applique qu'avec ADR-008)

## Contexte
À trancher à l'avance pour que la recette de `AGENTS.md` soit complète.

## Décision
Les deux : `after()` de Next.js traite l'événement juste après la réponse (rapide dans le cas nominal), et un script `npm run worker` reprend ce qui a échoué. L'idempotence (clé d'événement unique, statut traité) rend le double passage sans danger.

## Alternatives
* Script seul : reprise propre, mais un processus de plus à lancer partout.
* `after()` seul : rien à lancer, mais aucune reprise si le processus tombe.

## Conséquences
* Deux chemins à tester ; un nouveau script npm (ajout, pas de renommage) à signaler à la team Tests.
