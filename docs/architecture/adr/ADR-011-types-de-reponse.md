# ADR-011 · Types de réponse écrits à la main

* Statut : Proposée, à valider par l'équipe
* Décision source : D11

## Contexte
14 endpoints, un contrat OpenAPI strict vérifié sur chaque réponse par les tests.

## Décision
Les DTO (`ExpenseNoteDto`, `CompanyUserDto`, `SuggestionDto`) sont écrits à la main dans les presenters et partagés avec le client API du front. Génération depuis OpenAPI seulement s'il reste du temps.

## Alternatives
* Générés (`openapi-typescript`) : contrat source des types, mais dépendance et étape de génération en plus pour peu de gain.

## Conséquences
Un DTO peut diverger du contrat sans que le compilateur le voie ; les tests de contrat le voient.
