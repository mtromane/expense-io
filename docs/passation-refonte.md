# Passation de la refonte d'architecture : Expense.io

Branche : `refactor/architecture-modulaire` (base : `origin/main` fdcb4f8), arrêtée le 2026-10-26.
Plan suivi : `docs/audit/20-audit-architecture-arla.md` §5 (étapes 0 à 8). Règles : `AGENTS.md`.

## État en une phrase

Les étapes 0 à 6 sont faites et vérifiées par la suite complète ; 16 défauts sur 17 sont à `fixed: true`. L'étape 7 est commitée en **WIP non vérifié**. L'étape 8 n'est pas commencée. PERF-01 et PERF-02 restent à `fixed: false`, faute de mesure valable.

## Historique de la branche

```
df6ddc7 wip(front): étape 7 non vérifiée (ni build, ni lint, ni tests)
8a204a2 perf(db): étape 6, policies RLS indexables, plus de lecture de toutes les notes en attente
fa2e721 refactor(db): étape 6, RLS effective, company_id par trigger et index des listes
edeba05 refactor(receipt-scan): étape 5, OCR dans un module dédié, pool de workers borné
d9109ae refactor(expenses): étape 4, soumission et consultation des notes dans un module dédié
bfa0550 refactor(organization): étape 3, annuaire et rattachement bornés à l'entreprise
381d968 refactor(approval): étape 2, module de validation, domaine ranimé et décision atomique
f8a09ce refactor(shared): étape 1, socle HTTP commun route(), erreurs typées et presenters
24b6a21 refactor(config): étape 0, configuration validée au démarrage et règles d'architecture
f3ce521 … 9275de6 : 5 commits de la team Tests (lukas.ling), contenu de `tests/p2-unitaires`
```

- **Commits de la team Tests.** Les 5 premiers commits portent le contenu de `origin/tests/p2-unitaires`, rejoué sur le `main` actuel. Ils font partie de l'étape 0 (« fusionner `tests/p2-unitaires` »). Je les ai laissés tels quels pour conserver leur auteur ; ils partiront avec la branche.
- **Messages réécrits.** Avant la passation, seuls les messages ont changé (numéro d'étape, ligne « Défauts basculés »). Les arbres sont identiques commit par commit, et `git diff` entre l'ancien et le nouveau HEAD est vide. Il n'y avait aucun commit de correction intermédiaire à fusionner.
- **Contrôle sans tests sur `8a204a2`.** `npm run lint` passe (0 erreur, 1 avertissement d'architecture, voir étape 8) ; `npm run typecheck` passe.
- **Tests unitaires ajoutés.** Chaque module a ses unitaires, dans des **nouveaux** fichiers `tests/unit/modules/*.test.ts`. Aucun test existant n'a été modifié, mais `tests/` relève de la team Tests (CODEOWNERS) : elle doit relire ces fichiers dans la PR.

## Étape par étape

« Suite verte » = `make clean`, puis lint, typecheck, unitaires, build, et `npx playwright test --workers=2` : 280/280 (253 `@parity`), 0 réponse hors contrat.

| Étape | Commit | Défauts basculés | Prouvé | Non prouvé |
|---|---|---|---|---|
| 0 · config, ESLint (avertissement), fusion des unitaires | `24b6a21` | SEC-04 | Suite verte, 115 unitaires | ADR-001 à 011 au statut « Proposée », jamais validées en équipe |
| 1 · `shared/http` : `route()`, erreurs typées, presenters | `f8a09ce` | SEC-05, ROB-03a | Suite verte | — |
| 2 · module `approval` | `381d968` | ROB-02, SEC-02 | Suite verte, 125 unitaires | — |
| 3 · module `organization` | `bfa0550` | SEC-03, ROB-03e | Suite verte, 134 unitaires | — |
| 4 · module `expenses` | `d9109ae` | SEC-01, SEC-06, SEC-07, ROB-01, ROB-03b, ROB-03c, ROB-03d | Suite verte, 162 unitaires | — |
| 5 · module `receipt-scan` (pool Tesseract borné) | `edeba05` | SEC-08 | Suite verte, 168 unitaires ; OCR de référence stable sur 3 répétitions (51/51) | PERF-01 non basculé (voir Performance) |
| 6 · migration RLS effective, `company_id` par trigger, index | `fa2e721` | SEC-09 | Suite verte sur base vierge | PERF-02 non basculé |
| 6 bis · policies RLS indexables | `8a204a2` | aucun | Suite verte (charge max. 13) ; EXPLAIN ANALYZE sur la base de perf, médiane de 3 passages : liste manager 1 121 → 5 ms, RH 105 → 8 ms, employé 34 → 2 ms | Pas encore confirmé par `make test-perf` |
| 7 · front : `utils/format`, client API typé | `df6ddc7` (WIP) | aucun (BUG-01 visé, encore `fixed: false`) | Rien | Build, lint, typecheck, unitaires, Playwright, BUG-01 |
| 7 bis · métier fonctionnel | — | — | — | Pas commencé, bloqué (voir Écarts) |
| 8 · ESLint en erreur, suppression de `src/lib/*`, HLD/LLD/DAT | — | — | — | Pas commencé |

Défaut encore ouvert dans `tests/defects/registry.ts` : **BUG-01** seulement.

### Pourquoi `--workers=2`

Avec 4 workers, les parcours d'inscription (bcrypt coût 12, deux fois) dépassent leur délai de 5 s quand la machine est chargée. Le commit précédent sur le même Mac échoue de la même façon. C'est un paramètre de ligne de commande : la configuration Playwright n'a pas été modifiée. Sur une machine plus puissante, essaie d'abord la suite par défaut.

E2E-11 (`approvals-ui`, ligne 21) échoue quand la base a accumulé des notes en attente (plus de 1 300). Lance `make clean` avant chaque suite.

## Performance : PERF-01 et PERF-02

Dernière mesure : `make test-perf` sur `3c39507`, c'est-à-dire le contenu actuel de `8a204a2`, 3 passages A/B contre la baseline `265924b`.

| Scénario | p95 baseline | p95 courant | Ratio |
|---|---|---|---|
| P-OCR (PERF-01) | 4 055 ms | 366 ms | **0,09** (objectif ≤ 0,5) |
| P-EMP (PERF-02) | 648 ms | 790 ms | 1,22 |
| P-MGR (PERF-02) | 1 200 ms | 1 335 ms | 1,11 |
| P-HR (PERF-02) | 658 ms | 387 ms | 0,59 |

**Ces mesures ne comptent pas.** Les 8 scénarios sont « instables » (dispersion de 117 % à 2 316 %). La charge de la machine a atteint 329 pendant le run, et Docker Desktop (`com.docker.backend`) tournait à environ 680 % de CPU avec des conteneurs au repos. C'est la deuxième fois : la mesure de l'étape 5 avait déjà été faussée de la même façon.

- **PERF-01** atteint l'objectif à chaque mesure (3 fois), mais jamais sur une machine au repos. Je ne l'ai donc pas basculé.
- **PERF-02** contredit les mesures SQL (gain de 10 à 200 fois en EXPLAIN ANALYZE). La saturation explique très probablement ces chiffres. P-CREATE (1,52) et P-LOGIN (1,27) sont aussi en hausse sur ce run saturé : à vérifier sur une mesure propre, puisque la règle 7 interdit toute régression.

**À faire :** une mesure `make test-perf` sur une machine au repos, en lisant `perf-results/latest.md`. Passe `fixed: true` dans `tests/perf/targets.json` seulement si l'objectif est atteint avec des scénarios « stables ».

### Cause probable des emballements de Docker

`k6` n'était pas installé sur ce Mac. Dans ce cas, `tests/perf/compare.mjs` lance chaque scénario dans le conteneur `grafana/k6`. Tout le trafic de charge passe alors par la couche réseau de Docker Desktop vers le serveur Next.js de l'hôte. Les deux emballements sont arrivés pendant ou juste après `make test-perf`, et la charge restait au-dessus de 300 après la fin.

**Conseil :** installe k6 en natif avant de mesurer (`brew install k6`, ou le paquet de ta distribution) et vérifie `which k6`. Le script utilise alors le binaire, comme le prévoit `docs/perf/README.md`. Je n'ai pas pu le vérifier, mais c'est la piste la plus probable.

## Point CI à transmettre à la team Tests

L'étape 6 ajoute la variable `APP_DB_ROLE` (défaut `expense_app`, déjà dans `.env.example` et `src/config.ts`). Le code prend cette valeur par défaut, mais la variable doit être déclarée explicitement en CI :

- **ajouter `APP_DB_ROLE: expense_app`** aux jobs `parity` et `defects` de `.github/workflows/ci.yml` ;
- **pas à `baseline-proof`** : ce job lance la baseline `265924b`, qui ne connaît pas cette variable et n'a pas la migration qui crée le rôle.

`.github/` appartient à la team Tests : ce changement doit venir d'elle.

## Écarts avec la refonte telle que tu l'as décrite

Ces écarts reprennent les points que tu as cités. Le reste suit le plan §5 de `20-audit-architecture-arla.md`.

**Fait comme prévu :**

- monolithe modulaire `src/modules/{approval,expenses,organization,receipt-scan,shared}`, chacun en `domain/application/ports/infrastructure/index` ;
- garde centralisée `route()` ;
- domaine ranimé ;
- décision atomique (verrou optimiste) ;
- isolation par entreprise dans les repositories, plus une RLS effective (`SET LOCAL ROLE` via `APP_DB_ROLE`) ;
- `company_id` par trigger ;
- pool OCR borné ;
- contrat inchangé.

**Pas fait :**

- **Corrections métier D12 à D19** (401/403, validation des notes d'une RH, changement de rôle, langue des messages, domaines publics, total « Mes notes », code `Invalid manager`, statut de « Accès réservé »). Ces décisions ne sont **pas tranchées** : `docs/audit/21-decisions-architecture.md` ne contient que des recommandations, et `docs/architecture/adr/README.md` le dit explicitement. De plus, aucun défaut MET ni comportement correspondant n'existe dans `tests/defects/registry.ts`. Or `AGENTS.md` (règle 5) impose une option tranchée **et** un défaut `fixed: false` ajouté par la team Tests avant toute correction.
- **`PUT /api/hr/users/:id/role` et `GET /api/manager/reports`.** Ce sont des évolutions de contrat : elles doivent d'abord apparaître dans `docs/api/openapi.yaml` et dans les tests, côté team Tests, dans la même PR. Rien de cela n'existe. `/api/manager/reports` n'apparaît d'ailleurs dans aucun document du dépôt : sa spécification est à obtenir.
- **Module `identity`.** Il n'a pas été créé. L'inscription, la connexion et la session sont toujours dans `src/lib/auth.ts` et `src/app/actions/auth.ts`, qui importe `@/lib/db`. C'est le dernier avertissement ESLint d'architecture, et le prérequis pour passer ces règles en erreur à l'étape 8.

## Ce qu'il reste à faire, dans l'ordre

1. **Préparer la machine** : installer k6 en natif, puis `make clean`.
2. **Vérifier l'étape 7 (`df6ddc7`)** : `npm run lint && npm run typecheck && npm run test:unit`, puis `npm run build && npx playwright test`.
   - Si BUG-01 sort en « Expected to fail, but passed », passe `'BUG-01'` à `fixed: true` dans `tests/defects/registry.ts`.
   - Corrige ce qui casse, puis remplace le commit WIP par un commit `refactor(front): étape 7, …` (amend ou fixup + rebase ; la branche est poussée, donc préviens avant de réécrire).
   - Le code est décrit dans le message du commit : `src/utils/api.ts` (client typé), `formatDate` en UTC pour les dates `AAAA-MM-JJ`, DTO `CompanyUserDto`, `SuggestionDto` et `ReceiptUrlDto` dans `shared/http/presenters.ts`.
3. **Mesurer `make test-perf` sur une machine au repos.**
   - Bascule PERF-01 et PERF-02 seulement si l'objectif est atteint avec des scénarios stables.
   - Vérifie l'absence de régression sur P-CREATE et P-LOGIN.
   - Si PERF-02 reste au-dessus de 0,5 sur P-EMP ou P-MGR, regarde le plan d'exécution de ces listes sur la base `expense_io_perf` (port 3100 côté serveur de perf). Les scripts EXPLAIN ont été perdus avec `/tmp`, mais les requêtes sont dans les repositories.
4. **Étape 8.**
   - Créer le module `identity` : `signup`, `login`, `getActor` ; port `UserRepository` ; port `PasswordHasher`.
   - Sortir le SQL de `src/app/actions/auth.ts`.
   - Passer `ARCHITECTURE_LEVEL` à `"error"` dans `eslint.config.mjs`.
   - Supprimer ce qui reste de `src/lib/*` une fois vide. Attention : les unitaires de la team Tests figent l'API de `withUserScope`, `suggestFields` et `utils/*` ; ces fonctions peuvent être déplacées, pas cassées.
   - Rédiger `docs/architecture/HLD.md`, `LLD/<module>.md` et `DAT.md`.
   - Préparer le live coding : carte des modules dans `AGENTS.md` et `docs/architecture/ajouter-une-fonctionnalite.md` (§8.2 de l'audit).
   - Lancer la suite complète, puis faire la PR.
5. **Côté équipe, pas côté code.**
   - Valider les ADR-001 à 011 (statut « Proposée »).
   - Trancher D12 à D19.
   - Demander à la team Tests :
     - les défauts MET et l'OpenAPI des nouvelles routes ;
     - `APP_DB_ROLE` en CI ;
     - la relecture des unitaires `tests/unit/modules/`.
   - Ensuite seulement : étape 7 bis (métier).
6. **Avant la soutenance** : CI verte, tag `soutenance`.

## Fichiers hors dépôt sur l'ancien Mac (non transmis)

`../etape6.patch`, `../etape6-perf-rls.patch` et `../etape7.patch` sont des copies de secours devenues inutiles : tout est dans les commits. `etat-des-lieux.md` reste local et n'est pas versionné (`.git/info/exclude`).
