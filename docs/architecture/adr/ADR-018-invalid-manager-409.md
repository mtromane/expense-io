# ADR-018 · `409 Invalid manager`, y compris pour les cycles

* Statut : Acceptée par l'équipe le 2026-10-28
* Décision source : D18 (`B-05`, `V-04.2` ; défaut `MET-04`)

## Contexte
`Invalid manager` répondait `409`. Un cycle hiérarchique (A manage B, B manage A) était accepté, ce qui permettait une validation croisée.

## Décision
Garder `409 {"error":"Invalid manager"}` (conflit avec l'état de l'organigramme) et l'utiliser aussi pour refuser un rattachement qui créerait un cycle, à n'importe quelle profondeur.

## Alternatives
* `422` : change le contrat sans bénéfice métier.

## Conséquences
* Une requête récursive (remontée de la chaîne hiérarchique) au rattachement d'un manager : opération rare, coût négligeable.
* Deux rattachements simultanés qui formeraient un cycle : la vérification et l'écriture s'exécutent dans une transaction verrouillée par entreprise, le second est refusé (test de concurrence MET-04).
