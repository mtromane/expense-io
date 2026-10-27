# ADR-019 · Page « Accès réservé » servie en 403

* Statut : Proposée. Choix arrêté le 2026-10-26 par Maxence Larche ; **validation explicite de l'équipe requise avant fusion** (revue de la PR #6)
* Décision source : D19 (`B-04` ; défaut `AUTHZ-03`)

## Contexte
`/manager` et `/hr` affichaient « Accès réservé » avec un statut `200` à un utilisateur connecté au mauvais rôle.

## Décision
Même page, même texte, statut `403` : les pages appellent `forbidden()` (Next.js, option `experimental.authInterrupts`) et chaque segment a son `forbidden.tsx` avec le titre existant (« Accès réservé aux RH », « Accès réservé aux managers »). Le rôle est celui relu en base (ADR-014).

## Alternatives
* Garder `200` : rien à faire, mais non standard.

## Conséquences
* Dépend d'une option expérimentale de Next.js 16 : à revérifier lors d'une montée de version.
