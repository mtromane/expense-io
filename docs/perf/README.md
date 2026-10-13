# Performance — Expense.io

Le barème met **0** si l'application est moins performante après la migration. Sans référentiel fourni par les professeurs, la seule référence fiable est **l'application d'origine elle-même** : chaque mesure compare la version courante à la baseline, sur la même machine, au même moment, avec les mêmes données.

## Principe

`tests/perf/compare.mjs` :

1. prépare la baseline (worktree du commit `265924b`, build de production) et build la version courante ;
2. pour chaque passage, recrée une base dédiée `expense_io_perf`, applique **les migrations de la version mesurée**, puis la peuple avec `scripts/seed-perf.mjs` (20 entreprises, 2 001 utilisateurs, 193 300 notes, distribution déterministe) ;
3. démarre la version sur le port 3100 (build de production), chauffe, exécute les scénarios k6 ;
4. alterne les passages A, B, A, B, A, B (la dérive de la machine s'annule) et compare les **médianes de p95**.

On ne compare jamais à un chiffre stocké : seul compte le ratio `p95 courant / p95 baseline` mesuré dans le même run.

## Lancer

```bash
make test-perf   # baseline contre version courante (environ 15 min)
make perf-aa     # baseline contre elle-même : mesure du bruit
node tests/perf/compare.mjs --evaluate perf-results/latest.json   # réévalue un run sans remesurer
```

Si le port 3100 est déjà occupé (serveur d'un run interrompu), la mesure s'arrête avec un message au lieu de mesurer le mauvais serveur. Ctrl-C arrête proprement le serveur en cours.

Prérequis : Docker (Postgres, LocalStack) et k6 (binaire `k6`, sinon l'image Docker `grafana/k6:0.54.0` est utilisée automatiquement).

| Variable | Défaut | Rôle |
|---|---|---|
| `PERF_RUNS` | 3 | passages par version |
| `PERF_DURATION` | 15s | durée de chaque scénario |
| `PERF_WARMUP` | 10 | chauffe en secondes |
| `PERF_SCENARIOS` | tous | liste séparée par des virgules |
| `PERF_BASELINE_DIR` | `../expense-io-baseline` | worktree de la baseline (créé si absent) |
| `PERF_SKIP_BUILD` | — | `1` pour ne pas rebuilder la version courante |
| `PERF_REGRESSION_RATIO` | 1.10 | seuil de régression (ratio p95) |
| `PERF_MIN_DELTA_MS` | 5 | écart absolu minimal pour parler de régression |
| `PERF_LARGE_RATIO` | 1.5 | au-delà, régression même sous le plancher de 5 ms |
| `PERF_UNSTABLE_SPREAD` | 0.25 | dispersion au-delà de laquelle un scénario est « instable » |

Sur GitHub (`.github/workflows/perf.yml`) :

- **label `perf` sur une PR** : comparaison complète, rapport commenté sur la PR et affiché dans le résumé du job ;
- **à chaque merge sur `main`** (hors changements de documentation seuls) : mesure ajoutée à l'historique (branche `perf-history`, fichiers `docs/perf/history.jsonl` et `docs/perf/trend.md`) — un point de courbe par étape de migration, et une régression introduite sans label `perf` détectée sur le bon commit ;
- **lancement manuel** depuis l'onglet Actions (workflow `perf`, bouton « Run workflow ») : mode `ab` (comparaison) ou `aa` (baseline contre elle-même, pour mesurer le bruit du runner).

En CI, le seuil de régression est relevé à **1,25** (`PERF_REGRESSION_RATIO` dans `perf.yml`) : voir « Bruit mesuré ».

## Scénarios

| ID | Charge | Sert à |
|---|---|---|
| P-EMP | `GET /api/expense-notes`, employé à 1 000 notes, 5 utilisateurs simultanés | PERF-02 |
| P-MGR | `GET /api/manager/expense-notes`, manager à 48 rattachés | PERF-02 |
| P-HR | `GET /api/hr/expense-notes` | PERF-02 |
| P-USERS | `GET /api/hr/users` | garde-fou |
| P-CREATE | création de note avec reçu PNG (compte `writer`, lu par aucun autre scénario) | garde-fou |
| P-OCR | suggestion OCR, 5 utilisateurs simultanés (compte `writer`) | PERF-01 |
| P-MIX | montée de 0 à 50 utilisateurs simultanés, requêtes mixtes | saturation, erreurs |
| P-LOGIN | connexion (CSRF + identifiants) | garde-fou ; ne mesure **pas** le coût bcrypt de l'app (comptes de perf hachés en coût 4) |

Les connexions des scénarios ont lieu dans `setup()` et sont exclues des mesures (sous-métriques `{scenario:main}`).

## Lire le rapport

Le rapport est dans `perf-results/latest.md` (données brutes : `perf-results/latest.json`).

| Statut | Signification | Bloquant |
|---|---|---|
| `ok` | pas d'écart significatif | non |
| `instable` | dispersion entre passages > 25 % et pas de séparation nette : mesure non conclusive | non (relancer) |
| `régression` | voir les trois règles ci-dessous | **oui** |
| `erreurs` | plus de 1 % de requêtes en erreur | **oui** |

Une régression est signalée si l'une de ces règles est vraie :

1. mesure stable, p95 courant > 1,10 × baseline **et** plus de 5 ms d'écart ;
2. mesure stable, p95 courant > 1,5 × baseline (même sous 5 ms d'écart) ;
3. **séparation nette**, même si la mesure est instable : le meilleur passage courant est plus lent que le pire passage baseline × 1,10, avec plus de 5 ms d'écart.

La règle 3 empêche le statut `instable` de masquer un vrai ralentissement sur une machine bruyante (runner CI).

Le run échoue (code de sortie 1) en cas de régression, d'erreurs, ou d'incohérence sur les objectifs ci-dessous.

## Objectifs PERF-01 et PERF-02

Déclarés dans `tests/perf/targets.json`, avec la même logique que `tests/defects/registry.ts` :

| ID | Défaut | Objectif |
|---|---|---|
| PERF-01 | worker Tesseract recréé à chaque requête | p95 de P-OCR ≤ 50 % de la baseline |
| PERF-02 | index manquants sur les colonnes filtrées | p95 de P-EMP, P-MGR et P-HR ≤ 50 % de la baseline |

| `fixed` | Objectif | Résultat |
|---|---|---|
| `false` | manqué | « ouvert », normal |
| `false` | atteint | **échec** : passer `fixed: true` |
| `true` | atteint | « corrigé » |
| `true` | manqué | **échec** : déclaré corrigé à tort |

## Bruit mesuré (A/A) et choix des seuils

Baseline comparée à elle-même, en local (MacBook arm64, Docker Desktop), 3 passages alternés de 10 s par scénario, le 2026-10-12 :

| Scénario | p95 A | p95 A′ | Écart | Dispersion |
|---|---|---|---|---|
| P-EMP | 19 ms | 18 ms | −4 % | 8 % |
| P-MGR | 28 ms | 30 ms | +7 % | 14 % |
| P-HR | 14 ms | 18 ms | +22 % | 18 % |
| P-USERS | 3 ms | 3 ms | +7 % | 11 % |
| P-CREATE | 7 ms | 8 ms | +9 % | 16 % |
| P-OCR | 123 ms | 123 ms | 0 % | 16 % |
| P-MIX | 531 ms | 507 ms | −5 % | 16 % |
| P-LOGIN | 4 ms | 4 ms | −1 % | 62 % (instable) |

Conclusions :

- Sur des latences de quelques millisecondes, le bruit atteint **+22 %** pour un code identique (P-HR : 4 ms d'écart). Un seuil en pourcentage seul déclencherait de fausses régressions : d'où le **plancher de 5 ms** (`PERF_MIN_DELTA_MS`).
- Sur les latences plus élevées (P-OCR, P-MIX), le bruit reste autour de 5 % : le seuil de **10 %** est au-dessus.
- Avec les trois règles de régression, la mesure A/A réévaluée comme un A/B (`--evaluate`) ne signale aucune régression ; des régressions synthétiques (P-OCR × 3 avec baseline instable, P-USERS de 3 à 9 ms) sont signalées.
- P-LOGIN, très court, est souvent « instable » : il n'est pas conclusif seul.
- **Runner GitHub** : premier run de la PR #2 (2026-10-12), qui ne modifie pas l'application, donc deux côtés au code identique : écarts de −15 % (P-MGR, 21 ms), −12 % (P-HR, instable), +10 % (P-CREATE). Le bruit dépasse 10 % sur des latences de plusieurs dizaines de ms : le seuil de 1,10 y produirait de fausses régressions. Seuil CI relevé à **1,25** ; à recalibrer avec le mode `aa` du workflow (lancement manuel, une fois `perf.yml` sur `main`).

## Limites

- `scripts/seed-perf.mjs` écrit directement dans les tables `companies`, `users` et `expense_notes` : comme `scripts/seed-e2e.mjs`, il doit suivre une éventuelle évolution du schéma, et rester compatible avec la baseline (il est appliqué aux deux versions).
- Si la base n'est plus accédée en superuser (SEC-09), le seed doit pouvoir insérer malgré la RLS (rôle propriétaire ou `BYPASSRLS` pour le seed).
- Les mesures locales et CI ne sont pas comparables entre elles : seul le ratio d'un même run a un sens.
