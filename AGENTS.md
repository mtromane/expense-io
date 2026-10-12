# AGENTS.md — Expense.io

Instructions pour tout agent IA (et humain) qui modifie ce dépôt.

## Contexte

Application Next.js 16 de notes de frais (PostgreSQL, S3 via LocalStack, OCR tesseract.js), en cours de **migration d'architecture**. Un harnais de tests boîte noire garantit qu'aucun comportement n'est perdu.

**À lire avant toute modification : `docs/tests/criteres-fin-de-migration.md`** (ce qui est attendu, ce qui est interdit, comment vérifier).

## Règles obligatoires

1. **Ne déclare jamais une tâche terminée sans avoir lancé les tests et lu le résultat :**
   ```bash
   npm run build && npx playwright test   # environnement déjà prêt
   make test                              # depuis zéro (Docker, migrations, seed, build)
   ```
   Les tests attaquent le build de production : relance `npm run build` après chaque modification du code.
2. **Ne modifie jamais un fichier de `tests/`, `playwright.config.ts`, `scripts/seed-e2e.mjs` ou `.github/` pour faire passer un test.** Un test `@parity` rouge signale une régression : corrige le code applicatif. Ces fichiers appartiennent à la team Tests (`.github/CODEOWNERS`).
3. **Ne change pas le contrat** :
   - routes API, codes HTTP, forme du JSON, messages d'erreur ;
   - textes français de l'interface (labels, boutons) ;
   - scripts npm, cibles make, variables de `.env.example`, ports 3000 / 5433 / 4567 ;
   - comptes de démo de `scripts/seed.mjs`.
4. **Défauts techniques** (`tests/defects/registry.ts`) : pour en corriger un, corrige l'application puis passe `fixed: true` sur son identifiant dans la même modification. Ne passe jamais `fixed: true` sans correction réelle.
5. **Défauts métier MET-01 à MET-09** (`docs/tests/specs/2026-10-12-strategie-tests-design.md` §5.2) : ne les corrige pas, ils attendent une décision des professeurs.
6. **Schéma `users` / `companies`** : si tu le modifies, adapte `scripts/seed-e2e.mjs` en accord avec la team Tests, sinon les tests ne peuvent plus créer leurs acteurs.
7. **Performance** : aucune modification ne doit rendre l'application plus lente. Avant toute modification de l'OCR, des requêtes SQL ou des listes, lance `make test-perf` (comparaison avec la baseline) et lis `perf-results/latest.md`. Objectif PERF atteint → passe `fixed: true` dans `tests/perf/targets.json`.

## Lire le résultat des tests

- `✘` compté dans `passed` : défaut connu, échec attendu (`fixed: false`) — normal.
- `Expected to fail, but passed` : tu as corrigé un défaut → passe-le à `fixed: true`.
- `✘` compté dans `failed` sur un test `@parity` : régression → corrige le code.

Détail : `tests/README.md`.

## Commandes utiles

```bash
npx playwright test tests/api/manager.spec.ts --no-deps   # un fichier
npx playwright test --grep @SEC-03                        # un défaut
npx playwright test --grep @parity                        # toute la parité
make test-report                                          # rapport HTML
npm run lint && npm run typecheck                         # qualité
```
