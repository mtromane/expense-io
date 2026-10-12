# Tests — Expense.io

Harnais boîte noire : Playwright attaque l'application lancée en build de
production. Spec : `docs/tests/specs/2026-10-12-strategie-tests-design.md`.

## Lancer

```bash
make test          # tout (prépare Docker, migrations, seed, build)
make test-api      # contrat HTTP + défauts
make test-e2e      # parcours UI
make test-defects  # défauts techniques (rouge → vert)
make test-report   # rapport HTML
```

Une fois l'environnement prêt : `npx playwright test <fichier> --no-deps`.
`--no-deps` évite de relancer toute la suite : le projet `seed-checks`
(relance de seed-e2e) dépend de tous les autres tests et passe en dernier.

## Familles

| Tag | Règle |
|---|---|
| `@parity` | comportement de la baseline, doit toujours passer |
| `@defect` + `@SEC-xx` / `@ROB-xx` | défaut technique ; échec attendu tant que `fixed: false` dans `tests/defects/registry.ts` |

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
- Instance de panne sur le port 3001 (S3 injoignable, secret distinct) pour les tests d'erreur serveur.
