# Tests — Expense.io

Harnais boîte noire : Playwright attaque l'application lancée en build de
production. Spec : `docs/tests/specs/2026-10-12-strategie-tests-design.md`.

Ce qui est attendu à la fin de la migration, et comment le vérifier :
`docs/tests/criteres-fin-de-migration.md`.

## Lancer

```bash
make test          # tout (prépare Docker, migrations, seed, build)
make test-api      # contrat HTTP + défauts
make test-e2e      # parcours UI
make test-defects  # défauts techniques (rouge → vert)
make test-report   # rapport HTML
make test-perf     # performance contre la baseline (voir « Performance »)
```

Une fois l'environnement prêt : `npx playwright test <fichier> --no-deps`.
`--no-deps` évite de relancer toute la suite : le projet `seed-checks`
(relance de seed-e2e) dépend de tous les autres tests et passe en dernier.

## Familles

| Tag | Règle |
|---|---|
| `@parity` | comportement de la baseline, doit toujours passer |
| `@defect` + `@SEC-xx` / `@ROB-xx` / `@BUG-xx` | défaut technique ; échec attendu tant que `fixed: false` dans `tests/defects/registry.ts` |
| perf (hors Playwright) | PERF-01, PERF-02 et non-régression : `tests/perf/`, objectifs dans `tests/perf/targets.json` |

## Contrat d'API (OpenAPI)

`docs/api/openapi.yaml` décrit les 14 endpoints de l'app d'origine (requêtes,
réponses, codes HTTP, erreurs). Les contextes HTTP de `tests/support/auth.ts`
passent par `tests/support/contract.ts` : **chaque réponse de l'API obtenue par
un test est validée contre ce contrat** (schémas stricts : un champ en trop,
manquant ou mal typé, ou un code non documenté, fait échouer le test avec
l'écart exact). `tests/api/contract.spec.ts` vérifie le contrat lui-même.

Changements cassants entre le contrat et une autre spécification (par exemple
générée par la nouvelle architecture) : `make api-diff NEW=<spec>` (oasdiff).

## OCR de référence

`tests/fixtures/ocr/` contient des reçus fixes (générés par
`tests/fixtures/generate-ocr-receipts.mjs`) et, dans `expected/`, la sortie de
l'app d'origine pour chacun. `tests/api/ocr.spec.ts` exige la même sortie.
Réenregistrer (`OCR_RECORD=1 npx playwright test tests/api/ocr.spec.ts --no-deps`)
uniquement pour un changement voulu et validé par la team Tests.

## Pourquoi la CI est verte alors que des tests de défaut échouent

Les tests `@defect` décrivent le comportement **correct**. Sur l'application
actuelle, ils échouent réellement (exemple SEC-03 : le test attend `409`,
l'application renvoie `200`). Tant que le défaut est déclaré `fixed: false`
dans `tests/defects/registry.ts`, cet échec est **attendu** (`test.fail()`) :
Playwright l'affiche `✘` mais le compte comme réussi, et la CI reste verte.
Sans ce mécanisme, `main` serait rouge en permanence et on ne verrait plus
les vraies régressions.

Ce n'est pas permanent : `test.fail()` disparaît défaut par défaut.

| Moment | `fixed` | Défaut | Résultat du test | CI |
|---|---|---|---|---|
| Avant correction | `false` | présent | échoue (attendu) | verte |
| Corrigé, registre pas à jour | `false` | corrigé | passe (inattendu) : « Expected to fail, but passed » | **rouge** → passer `fixed: true` |
| Corrigé et déclaré | `true` | corrigé | passe, test normal | verte |
| Déclaré corrigé à tort | `true` | présent | échoue | **rouge** |

Fin de migration : les 17 identifiants sont à `fixed: true`, plus aucun échec
attendu, tous les tests passent au sens propre.

## Corriger un défaut

1. Corriger l'application.
2. Passer `fixed: true` pour l'identifiant dans `tests/defects/registry.ts`.
3. `make test-defects` doit passer. Si le test passe alors que `fixed` est false, la CI échoue.

## Données

- `tests/fixtures/dataset.json` décrit les acteurs ; `scripts/seed-e2e.mjs` les crée (lancé par le globalSetup).
- Chaque test crée ses notes via l'API avec une description unique.
- Un test qui modifie la hiérarchie utilise un acteur qui lui est réservé (`reassign*`).
- Aucun SQL dans `tests/`.

## Règles

- Ne jamais modifier un test `@parity` pour le faire passer : cela change un comportement, à justifier dans la PR.
- `tests/`, `playwright.config.ts`, `scripts/seed-e2e.mjs`, `docs/tests/` et `.github/` appartiennent à la team Tests (`.github/CODEOWNERS`) : leur review est demandée automatiquement sur toute PR qui les touche.
- Instance de panne sur le port 3001 (S3 injoignable, secret distinct) pour les tests d'erreur serveur.

## Limite connue : baseline-proof et schéma

Le job `baseline-proof` lance `scripts/seed-e2e.mjs` **de la branche** contre
la base créée par les migrations **de la baseline**. Si la migration
d'architecture change le schéma `users` / `companies` (nouvelle table, colonne
NOT NULL, rôle SQL dédié pour SEC-09) et adapte `seed-e2e.mjs`, ce job casse.
Dans ce cas : garder `seed-e2e.mjs` compatible avec les deux schémas, ou
l'adapter selon `APP_DIR` (une version du seed par application testée).

## Performance

Comparaison automatique contre la baseline (k6, même machine, ratios p95) :

```bash
make test-perf   # baseline contre version courante, environ 15 min
make perf-aa     # baseline contre elle-même : mesure du bruit
```

Sur GitHub : poser le label `perf` sur une PR, le rapport est commenté
automatiquement ; mesure complète à chaque merge sur `main`. Objectifs PERF-01 et
PERF-02 : `tests/perf/targets.json` (même logique `fixed` que les défauts).
Détail : `docs/perf/README.md`.
