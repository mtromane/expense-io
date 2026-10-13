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
   - routes API, codes HTTP, forme du JSON, messages d'erreur : tout est décrit dans `docs/api/openapi.yaml` et vérifié sur chaque réponse des tests (« Réponse hors contrat » = régression ; ne modifie jamais ce fichier pour faire passer un test) ;
   - sortie de la suggestion OCR sur les reçus de référence (`tests/fixtures/ocr/`) ;
   - textes français de l'interface (labels, boutons) ;
   - scripts npm, cibles make, variables de `.env.example`, ports 3000 / 5433 / 4567 ;
   - comptes de démo de `scripts/seed.mjs`.
4. **Défauts techniques** (`tests/defects/registry.ts`) : pour en corriger un, corrige l'application puis passe `fixed: true` sur son identifiant dans la même modification. Ne passe jamais `fixed: true` sans correction réelle.
5. **Le métier doit être totalement fonctionnel** (décision d'équipe du 2026-10-13). Les défauts métier MET-01 à MET-09 et les comportements étranges inventoriés dans `docs/audit/22-comportements-a-corriger.md` sont **à corriger**, ce sont des exceptions voulues aux règles 2 et 3. Conditions :
   * corrige seulement une option **tranchée** dans `docs/audit/21-decisions-architecture.md` ; si l'option n'est pas tranchée, arrête toi et demande ;
   * le comportement attendu doit d'abord exister comme défaut (`fixed: false`) dans `tests/defects/registry.ts`, ajouté par la team Tests avec son test ; ensuite seulement tu corriges, puis tu passes `fixed: true` (règle 4) ;
   * les évolutions de contrat (nouvelle route, nouveau champ, code HTTP corrigé) sont faites dans `docs/api/openapi.yaml` et dans les tests de parité concernés par la team Tests, dans la même PR, jamais pour masquer une régression ;
   * corrige **en ajoutant** plutôt qu'en remplaçant : aucun texte d'interface existant renommé, aucune route ou champ existant retiré ;
   * comportements conservés volontairement : note hors périmètre → `404` (ne pas révéler son existence) ; une note en attente suit le nouveau manager après réaffectation (MET-07).
6. **Schéma `users` / `companies`** : si tu le modifies, adapte `scripts/seed-e2e.mjs` en accord avec la team Tests, sinon les tests ne peuvent plus créer leurs acteurs.
7. **Performance** : aucune modification ne doit rendre l'application plus lente. Avant toute modification de l'OCR, des requêtes SQL ou des listes, lance `make test-perf` (comparaison avec la baseline) et lis `perf-results/latest.md`. Objectif PERF atteint → passe `fixed: true` dans `tests/perf/targets.json`. Détail : `docs/perf/README.md`.

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
