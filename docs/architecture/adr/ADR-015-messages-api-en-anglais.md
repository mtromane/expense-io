# ADR-015 · Messages d'erreur de l'API en anglais, écran inchangé

* Statut : Acceptée (équipe, 2026-10-26)
* Décision source : D15 (`B-06`, `V-15.2` ; défaut `API-01`)

## Contexte
L'API mélangeait l'anglais (`Not found`, `Already decided`, `Invalid manager`, `Unauthorized`) et le français (`Champs invalides`, `Type de fichier non autorisé pour le reçu`, `Fichier trop volumineux`).

## Décision
Tous les messages d'erreur de l'API sont en anglais : `Invalid fields`, `Receipt file type not allowed`, `File too large`. L'écran garde exactement ses textes actuels : le client des écrans (`src/utils/api.ts`) traduit les messages de l'API qu'il affiche. Les messages des formulaires d'inscription et de connexion (textes d'interface) ne changent pas.

## Alternatives
* Traduire seulement à l'écran : API incohérente.
* Tout en français : casse les tests qui lisent les messages anglais existants.
* Codes d'erreur stables : change la forme JSON du contrat.

## Conséquences
* Les tests qui lisent ces trois messages suivent le registre (`tests/support/messages.ts`) : français sur la baseline, anglais une fois `API-01` corrigé.
* Aucun texte d'écran ne change : les E2E existants restent valides.
