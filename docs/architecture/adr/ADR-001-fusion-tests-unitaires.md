# ADR-001 · Reprendre les tests unitaires de `tests/p2-unitaires` maintenant

* Statut : Acceptée par l'équipe le 2026-10-28
* Décision source : D1

## Contexte
La branche `tests/p2-unitaires` apporte Vitest et 115 tests unitaires sur le code existant (`lib/`, `domain/`, `utils/`, `proxy`), ainsi que 72 tests de parité supplémentaires. Elle part du commit initial : son historique duplique celui de `main`.

## Décision
Reprendre ses 5 commits réellement nouveaux par cherry-pick avant toute refacto. `AGENTS.md` et `docs/tests/criteres-fin-de-migration.md` gardent la version de `main` (règle 5 du 13 octobre).

## Alternatives
* Plus tard : liberté de redessiner le domaine, mais refacto sans filet unitaire et fusion douloureuse après déplacement des fichiers.

## Conséquences
* Les API de `ExpenseNote`, `User`, `withUserScope`, `getPool`, `suggestFields`, `respondError`, `utils/*` sont figées : on les fait évoluer sans casser leurs assertions.
* Les chemins `@/lib/*`, `@/domain/*`, `@/utils/*` restent en place (aucun chemin d'import de test n'est modifié).
* `make test` lance les unitaires avant Playwright.
