# ADR-008 · Pas de socle asynchrone à l'avance

* Statut : Acceptée par l'équipe le 2026-10-28
* Décision source : D8

## Contexte
Aucune fonctionnalité actuelle n'a besoin d'asynchrone (l'OCR reste synchrone et borné). La fonctionnalité du live coding, imposée le jour J, pourrait en demander (notification, service externe).

## Décision
Aucun code asynchrone sans usage. La recette (pattern outbox : table d'événements écrite dans la transaction métier, worker idempotent, nombre d'essais et file d'erreurs) est décrite dans `AGENTS.md` pour être appliquée si une fonctionnalité l'exige. `NotificationPort` reste le point d'entrée prévu.

## Alternatives
* Socle outbox codé sans consommateur : démo rapide, mais exactement le travers reproché à l'existant (infrastructure inutilisée).
* Broker (Redis, RabbitMQ, SQS) : nouveau service en dev et en CI, double écriture sans outbox, hors de proportion.

## Conséquences
* KISS : rien à maintenir sans cas réel.
* Si le live coding exige de l'asynchrone, l'outbox est à coder en direct, en suivant la recette.
