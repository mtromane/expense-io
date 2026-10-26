# ADR-017 · Total « Mes notes » détaillé par statut

* Statut : Acceptée (équipe, 2026-10-26)
* Décision source : D17 (`M-04` ; défaut `UI-01`)

## Contexte
Le total de « Mes notes » additionnait aussi les notes rejetées, sans le dire.

## Décision
Sous le résumé existant (« N notes · X € au total », texte inchangé), la page affiche le total par statut : « En attente : … · Approuvées : … · Rejetées : … ».

## Alternatives
* Exclure les rejetées du total : moins informatif, et le total ne dit plus combien a été demandé.

## Conséquences
* Ajout pur : aucun texte existant ne change, `E2E-03` reste valide.
