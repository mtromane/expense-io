# Guide d'onboarding — Expense.io

> Généré depuis le knowledge graph Understand-Anything (`.ua/knowledge-graph.json`, commit `aae9d7f`, 139 fichiers, 256 nœuds, 768 relations). Pour explorer le graphe : `/understand-anything:understand-dashboard`.

## 1. Vue d'ensemble

**Expense.io** (`expense-io-version-b`) est une application Next.js de gestion de notes de frais : PostgreSQL, stockage des reçus sur S3 (LocalStack en local), OCR des reçus avec tesseract.js. Trois profils y collaborent autour d'un circuit d'approbation : **employé**, **manager** et **RH** (`hr_admin`).

| | |
|---|---|
| **Langages** | TypeScript (majoritaire), JavaScript, SQL, YAML, JSON, CSS, Shell, Makefile, Markdown |
| **Frameworks** | Next.js 16 (App Router), React 19, NextAuth v5 (Auth.js), Tailwind CSS v4, Playwright, Docker Compose, GitHub Actions |
| **Infra locale** | PostgreSQL 16 (port 5433), LocalStack 3.8.1 S3 (port 4567), application (port 3000) |

**Le projet est en pleine migration d'architecture.** Deux idées comptent avant toute chose :

1. **Parité** : un harnais de tests boîte noire (Playwright) vérifie qu'aucun comportement visible n'est perdu.
2. **Contrat figé** : routes API, codes HTTP, forme du JSON, messages d'erreur, sortie OCR, textes français de l'UI, scripts npm, cibles make, variables d'environnement, ports et comptes de démo ne doivent pas changer.

À lire en premier : `AGENTS.md` (règles obligatoires), puis `docs/tests/criteres-fin-de-migration.md` (définition de « terminé »).

### Démarrer

```bash
make dev        # Docker (Postgres + LocalStack), migrations, bucket, seed, serveur sur :3000
make test       # harnais complet depuis zéro
npm run build && npx playwright test   # si l'environnement est déjà prêt
```

Comptes de démo (`scripts/seed.mjs`) : `hr@expense.io` / `hr1234`, `manager@expense.io` / `manager1234`, `demo@expense.io` / `demo1234`.

## 2. Couches d'architecture

Le graphe identifie 9 couches. Les 4 premières forment l'application, les 5 suivantes l'entourent.

```
            ┌─────────────────────────┐        ┌──────────────────────┐
            │  Interface utilisateur  │        │  Contrat OpenAPI     │◄── validé par ──┐
            │  (pages, composants)    │        │  (14 opérations)     │                 │
            └───────────┬─────────────┘        └──────────────────────┘                 │
                        │ fetch /api                                                     │
            ┌───────────▼─────────────┐        ┌──────────────────────┐   ┌─────────────┴──────┐
            │  Couche API             │──────► │ Services techniques  │   │ Harnais de tests   │
            │  (route handlers, proxy)│  44×   │ historiques (src/lib)│   │ boîte noire        │
            └───────────┬─────────────┘        └──────────┬───────────┘   └────────────────────┘
                        │ SQL brut                        │
            ┌───────────▼─────────────────────────────────▼─┐   ┌──────────────────────────┐
            │  Schéma et données (PostgreSQL + RLS, seeds)   │   │ Domaine/ports/adaptateurs│
            └────────────────────────────────────────────────┘   │ (pas encore branché)     │
                                                                 └──────────────────────────┘
```

| Couche | Rôle | Fichiers clés |
|---|---|---|
| **Couche API** (15) | Route handlers Next.js sous `src/app/api` (employé, manager, RH, NextAuth) et `src/proxy.ts`, qui orchestrent auth, SQL, S3 et OCR via `src/lib`. | `src/app/api/expense-notes/route.ts`, `src/app/api/hr/users/[id]/manager/route.ts`, `src/proxy.ts` |
| **Interface utilisateur** (12) | Pages App Router, layout racine, Server Actions d'authentification, composants React. | `src/app/layout.tsx`, `src/app/expenses/page.tsx`, `src/app/actions/auth.ts`, `src/components/AdminConsole.tsx` |
| **Domaine, ports et adaptateurs** (6) | Noyau hexagonal en cours de migration : entités `ExpenseNote` et `User`, ports de stockage et de notification, adaptateurs S3 et console. | `src/domain/*.ts`, `src/ports/*.ts`, `src/adapters/*.ts` |
| **Services techniques historiques** (8) | Pool PostgreSQL, config NextAuth, client S3, OCR, gestion d'erreurs, utilitaires. Les fichiers les plus importés du projet. | `src/lib/auth.ts`, `src/lib/db.ts`, `src/lib/ocr.ts`, `src/lib/storage.ts` |
| **Schéma et données** (8) | Migration SQL initiale (3 tables + RLS) et scripts de bucket et de seed. | `migrations/1700000000001_init-schema.sql`, `scripts/seed*.mjs`, `scripts/ensure-bucket.mjs` |
| **Contrat OpenAPI** (15) | `docs/api/openapi.yaml` et ses 14 opérations : contrat figé validé sur chaque réponse des tests. | `docs/api/openapi.yaml` |
| **Harnais de tests boîte noire** (47) | Suites Playwright (API, e2e, défauts, ops, contrat, smoke), helpers, fixtures, registre des défauts, perf k6. | `playwright.config.ts`, `tests/support/*`, `tests/defects/registry.ts`, `tests/perf/compare.mjs` |
| **Configuration, CI et exploitation** (14) | `package.json`, tsconfig, configs Next/ESLint/PostCSS, `.env.example`, Docker Compose, Makefile, workflows GitHub. | `Makefile`, `docker-compose.yml`, `.github/workflows/ci.yml` |
| **Documentation et audit** (33) | README, consignes agents, audit sécurité et architecture ARLA avec ses PoC, stratégie de tests, guide perf. | `docs/audit/README.md`, `docs/audit/12-constats.md`, `docs/audit/20-audit-architecture-arla.md` |

**Ce que montre le graphe des dépendances :**
- `src/app/api` importe `src/lib` 44 fois : c'est la dépendance dominante. Les routes exécutent aussi directement du SQL sur `companies`, `users` et `expense_notes`.
- Aucune route ni page n'utilise encore `src/domain`, `src/ports` ou `src/adapters`. Seuls les adaptateurs importent les ports. La couche hexagonale est pour l'instant **décorative**.
- Toutes les suites de tests passent par `tests/support` (66 imports).

## 3. Concepts clés

### Modèle métier et multi-entreprise
- **Rattachement par domaine e-mail** : sur `/signup`, le premier compte d'un domaine crée l'entreprise et devient RH ; les suivants la rejoignent comme employés. Le rôle `manager` n'est assignable que par le seed ou en base.
- **Hiérarchie** : `users.manager_id` est auto-référencé. Un manager traite les notes de ses **subordonnés directs** ; la RH traite celles des **managers racines** (sans supérieur) de son entreprise et peut (ré)affecter le manager d'un utilisateur.
- **Cycle de vie d'une note** : `pending` → `approved` ou `rejected`. Une seconde décision renvoie 409 « Already decided » ; une note hors périmètre renvoie 404.

### Les quatre couches d'autorisation
Analysées dans `docs/audit/06-autorisation.md` :
1. **Proxy** (`src/proxy.ts`) : redirige vers `/login` tout accès anonyme à `/expenses`, `/manager` et `/hr`.
2. **Test de rôle** dans chaque route handler.
3. **`WHERE` manuels** dans le SQL de chaque route (les routes approve/reject sont des jumelles quasi identiques).
4. **Row Level Security** PostgreSQL sur `expense_notes`, activée par `withUserScope` (`src/lib/db.ts`), qui ouvre une transaction et positionne `app.current_user_id`. D'après l'audit (V-05), le rôle de connexion est superuser, ce qui contourne la RLS.

### Le harnais de tests et ses conventions
- **Boîte noire sur le build de production** : relancer `npm run build` après chaque modification.
- **`@parity`** : comportement à préserver. Un test rouge signale une régression : corriger le code, jamais le test.
- **`@defect`** : défaut technique connu (SEC, ROB, BUG), déclaré dans `tests/defects/registry.ts` avec un drapeau `fixed`. Tant que `fixed: false`, le test est un échec attendu (`expectDefect`). Pour corriger un défaut, corriger l'application **et** passer `fixed: true` dans la même modification.
- **Défauts métier MET-01 à MET-09** : à ne pas corriger, ils attendent une décision des professeurs.
- **Contrat validé automatiquement** : `tests/support/contract.ts` compile `openapi.yaml` avec Ajv et enveloppe chaque contexte HTTP dans un Proxy. Toute réponse non conforme lève « Réponse hors contrat ».
- **Matrice d'autorisation** : `tests/api/authz-matrix.ts` déclare le code HTTP attendu par route et par profil d'acteur ; `authz.spec.ts` génère un test par cellule.
- **OCR de référence** : `tests/fixtures/ocr/expected/*.json` fige la sortie `{amount, expenseDate}` sur des reçus fixes, y compris `{}` pour un reçu illisible.
- **Propriété** : `tests/`, `playwright.config.ts`, `scripts/seed-e2e.mjs`, `.github/` et les docs de tests appartiennent à la team Tests (`.github/CODEOWNERS`).

### Performance
Règle « ne pas ralentir l'application ». `tests/perf/compare.mjs` recrée une base remplie par `scripts/seed-perf.mjs` (~193 000 notes), démarre baseline et version courante en production et exécute les scénarios k6 en alternance. Objectifs dans `tests/perf/targets.json` : **PERF-01** (worker Tesseract recréé à chaque appel) et **PERF-02** (index manquants sur les listes). Lancer `make test-perf` avant toute modification de l'OCR, du SQL ou des listes, puis lire `perf-results/latest.md`.

## 4. Visite guidée

Ordre de lecture recommandé, en 15 étapes :

| # | Étape | À lire |
|---|---|---|
| 1 | **Vue d'ensemble** : produit, démarrage, règles « parité » et « contrat figé ». | `README.md`, `AGENTS.md` |
| 2 | **Environnement local** : le Makefile est le vrai point d'entrée ; ports, variables et scripts font partie du contrat. | `Makefile`, `docker-compose.yml`, `.env.example`, `package.json` |
| 3 | **Schéma et RLS** : entreprises, utilisateurs avec rôle et hiérarchie, notes avec statut ; policies RLS sur `app.current_user_id`. | `migrations/1700000000001_init-schema.sql`, `scripts/seed.mjs` |
| 4 | **Services techniques** : NextAuth JWT + Credentials/bcrypt, pool et `withUserScope`, réponse 500 centralisée. | `src/lib/auth.ts`, `src/lib/db.ts`, `src/lib/errors.ts`, `src/types/next-auth.d.ts` |
| 5 | **Entrée de l'app** : pas de `main` ; layout racine, redirection de `/`, proxy, Server Actions d'inscription. | `src/app/layout.tsx`, `src/app/page.tsx`, `src/proxy.ts`, `src/app/actions/auth.ts` |
| 6 | **Flux employé** : liste et création de notes, téléversement S3, URL pré-signée, page « Mes notes de frais ». | `src/app/api/expense-notes/route.ts`, `src/lib/storage.ts`, `src/app/expenses/page.tsx` |
| 7 | **Suggestion OCR** : tesseract.js en français + heuristiques regex ; sortie figée par les fixtures. | `src/lib/ocr.ts`, `src/app/api/expense-notes/receipt-suggestion/route.ts`, `next.config.ts` |
| 8 | **Approbation manager et RH** : routes jumelles avec autorisation codée à la main ; écart sur `receipt-url` manager. | `src/app/api/manager/expense-notes/[id]/*`, `src/app/api/hr/**`, `src/components/PendingApprovalsPanel.tsx` |
| 9 | **Noyau hexagonal** : entités, ports, adaptateurs. À comparer avec l'étape 8, où la logique métier vit encore. | `src/domain/*`, `src/ports/*`, `src/adapters/S3ReceiptAdapter.ts` |
| 10 | **Contrat OpenAPI** : 14 opérations, schémas stricts, validation automatique de chaque réponse. | `docs/api/openapi.yaml`, `tests/support/contract.ts`, `tests/api/contract.spec.ts` |
| 11 | **Harnais boîte noire** : seed des acteurs, dataset à deux entreprises, matrice d'autorisation. | `tests/README.md`, `playwright.config.ts`, `scripts/seed-e2e.mjs`, `tests/api/authz-matrix.ts` |
| 12 | **Défauts connus** : registre, `expectDefect`, défauts techniques vs métier. | `tests/defects/registry.ts`, `tests/defects/security.spec.ts`, `docs/tests/specs/2026-10-12-strategie-tests-design.md` |
| 13 | **Performance A/B** : seed volumineux, k6, objectifs PERF-01/PERF-02. | `docs/perf/README.md`, `tests/perf/compare.mjs`, `tests/perf/targets.json` |
| 14 | **CI et « terminé »** : lint/typecheck/build, @parity et @defect, `baseline-proof`, perf, CODEOWNERS. | `.github/workflows/ci.yml`, `.github/workflows/perf.yml`, `docs/tests/criteres-fin-de-migration.md` |
| 15 | **Audit** : cartographie, 63 constats cotés (3 critiques), PoC, audit d'architecture ARLA et cible Clean Architecture. | `docs/audit/README.md`, `docs/audit/12-constats.md`, `docs/audit/20-audit-architecture-arla.md` |

## 5. Carte des fichiers

### Couche API — `src/app/api`
| Fichier | Rôle |
|---|---|
| `auth/[...nextauth]/route.ts` | Ré-exporte les handlers GET/POST de NextAuth. |
| `expense-notes/route.ts` | GET : notes de l'employé (tri dynamique `?sort=`) ; POST : création multipart avec téléversement du reçu. |
| `expense-notes/[id]/receipt-url/route.ts` | URL pré-signée du reçu de l'employé, sous `withUserScope`. |
| `expense-notes/receipt-suggestion/route.ts` | POST d'un reçu → suggestion `{amount, expenseDate}` par OCR. |
| `manager/expense-notes/route.ts` | Notes en attente des subordonnés directs. |
| `manager/expense-notes/[id]/{approve,reject}/route.ts` | Décision du manager (404 hors périmètre, 409 si déjà décidée). |
| `manager/expense-notes/[id]/receipt-url/route.ts` | URL du reçu côté manager, **sans** contrôle hiérarchique ni `withUserScope`. |
| `hr/expense-notes/route.ts` | Notes en attente des managers racines de l'entreprise. |
| `hr/expense-notes/[id]/{approve,reject,receipt-url}/route.ts` | Décision RH et URL du reçu, limitées à l'entreprise. |
| `hr/users/route.ts` | Annuaire des employés et managers de l'entreprise. |
| `hr/users/[id]/manager/route.ts` | (Ré)affecte ou retire le manager d'un utilisateur. |
| `src/proxy.ts` | Middleware Next.js 16 : redirection vers `/login` des accès anonymes. |

### Interface utilisateur
| Fichier | Rôle |
|---|---|
| `src/app/layout.tsx` | Layout racine : polices, session, navigation par rôle, déconnexion. |
| `src/app/page.tsx` | Accueil : redirige vers `/expenses` si connecté. |
| `src/app/actions/auth.ts` | Server Actions : inscription (création d'entreprise par domaine, bcrypt), connexion, déconnexion. |
| `src/app/login/page.tsx`, `src/app/signup/page.tsx` | Formulaires clients reliés aux Server Actions via `useActionState`. |
| `src/app/expenses/page.tsx` | « Mes notes de frais » : liste, création avec reçu, pré-remplissage OCR. |
| `src/app/manager/page.tsx`, `src/app/hr/page.tsx` | Pages serveur gardées par rôle. |
| `src/components/PendingApprovalsPanel.tsx` | Panneau du manager : approuver, rejeter, voir le reçu. |
| `src/components/AdminConsole.tsx` | Console RH : affectation des managers, décisions sur les notes des managers racines. |
| `src/components/NavItem.tsx` | Lien de navigation avec onglet actif. |

### Services techniques — `src/lib`, `src/utils`, `src/types`
| Fichier | Rôle |
|---|---|
| `src/lib/auth.ts` | Config NextAuth : JWT, Credentials + bcrypt contre `users`, id et rôle dans la session. |
| `src/lib/db.ts` | Pool PostgreSQL singleton et `withUserScope` (transaction + `app.current_user_id`). |
| `src/lib/storage.ts` | Client S3 paresseux, clés de reçu, upload, URL pré-signées. |
| `src/lib/ocr.ts` | tesseract.js (`fra`) + regex pour extraire montant et date. |
| `src/lib/errors.ts` | `respondError` : log + réponse 500 avec message et stack. |
| `src/utils/format.ts`, `src/utils/validators.ts` | Formatage fr-FR ; prédicats de validation. |
| `src/types/next-auth.d.ts` | Augmentation des types NextAuth (id, rôle). |

### Domaine, ports et adaptateurs
| Fichier | Rôle |
|---|---|
| `src/domain/ExpenseNote.ts` | Entité note de frais et règles de décision. |
| `src/domain/User.ts` | Entité utilisateur, rôles, règles de hiérarchie. |
| `src/ports/ReceiptStoragePort.ts`, `src/ports/NotificationPort.ts` | Contrats de stockage des reçus et de notification. |
| `src/adapters/S3ReceiptAdapter.ts` | Implémente le port de stockage en déléguant à `lib/storage`. |
| `src/adapters/ConsoleNotificationAdapter.ts` | Implémente le port de notification en journalisant. |

### Données et scripts
| Fichier | Rôle |
|---|---|
| `migrations/1700000000001_init-schema.sql` | Tables `companies`, `users`, `expense_notes` ; RLS avec 6 policies. |
| `scripts/seed.mjs` | Seed de démo idempotent (entreprise, 3 comptes, notes avec vrai reçu). |
| `scripts/seed-e2e.mjs` | Acteurs de test depuis `tests/fixtures/dataset.json` (team Tests). |
| `scripts/seed-perf.mjs` | Seed volumineux pour les mesures de performance. |
| `scripts/ensure-bucket.mjs` | Crée le bucket S3 sur LocalStack, avec retry. |

### Tests — `tests/`
| Dossier / fichier | Rôle |
|---|---|
| `api/` | Parité par espace (employé, manager, RH, reçus, OCR, auth), matrice d'autorisation, contrat. |
| `e2e/` | Parcours UI E2E-01 à E2E-08 (inscription, connexion, employé, manager, RH, reçus, gardes). |
| `defects/` | Défauts SEC, ROB, BUG et le registre `registry.ts`. |
| `ops/` | Scripts npm, cibles make, variables d'env, idempotence du seed. |
| `support/` | Acteurs, auth, contrat, fichiers, notes, helpers UI. |
| `fixtures/` | Dataset, reçus de test, sorties OCR attendues et leurs générateurs. |
| `perf/` | `compare.mjs`, scénarios k6, `targets.json`, `trend.mjs`. |

### Configuration, CI et docs
| Fichier | Rôle |
|---|---|
| `Makefile` | Tâches de dev et de test (Docker, migrations, seed, build, suites Playwright, perf). |
| `docker-compose.yml` | PostgreSQL 16 (5433) et LocalStack S3 (4567). |
| `.env.example` | Variables attendues (PostgreSQL, secret Auth.js, S3). Elles font partie du contrat. |
| `next.config.ts` | Exclut tesseract.js du bundling serveur. |
| `.github/workflows/ci.yml` | Lint, typecheck, build, @parity et @defect, preuve sur la baseline. |
| `.github/workflows/perf.yml` | Comparaison k6 sur les PR étiquetées « perf ». |
| `docs/audit/` | Cartographie (01–07), audit (10–14), PoC, audit d'architecture ARLA (20). |
| `docs/tests/` | Critères de fin de migration, stratégie de tests, plans P0 et P1. |

## 6. Points chauds

### Complexité élevée (code)
| Fichier | Pourquoi y aller prudemment |
|---|---|
| `src/app/expenses/page.tsx` | Plus gros composant (312 lignes) : formulaire, liste, OCR et reçu mêlés. Textes français et formatage fr-FR couverts par les tests E2E. |
| `src/components/AdminConsole.tsx` | Console RH (269 lignes) qui appelle plusieurs routes API ; couverte par E2E-05. |
| `docs/api/openapi.yaml` | Le contrat lui-même : **ne jamais le modifier pour faire passer un test**. |
| `tests/perf/compare.mjs` | Orchestrateur A/B (346 lignes) ; propriété de la team Tests. |

### Risque élevé (complexité modérée, mais fragile ou défaut connu)
| Fichier | Point d'attention |
|---|---|
| `src/app/api/expense-notes/route.ts` | Le paramètre `sort` est concaténé dans `ORDER BY` (SEC-01, PoC V-07). Ordre et forme de la liste sous contrat. |
| `src/app/api/manager/expense-notes/[id]/receipt-url/route.ts` | Recherche par `id` seul, hors `withUserScope` : accès entre entreprises (PoC V-06). |
| `src/app/api/hr/users/[id]/manager/route.ts` | Pas de contrôle que le manager choisi appartient à la même entreprise (SEC-03). |
| `src/lib/auth.ts` | Secret de session codé en dur, `AUTH_SECRET` ignoré (SEC-04, PoC V-08). Fichier le plus importé. |
| `src/lib/errors.ts` | Renvoie la stack trace au client (SEC-05, PoC V-11). |
| `src/lib/ocr.ts` | Sortie figée par les fixtures ; worker Tesseract recréé à chaque appel (PERF-01) ; pas de limite de taille (SEC-08). |
| `src/lib/storage.ts` | Clés de reçu séquentielles et prévisibles (SEC-06, PoC V-34). |
| `src/lib/db.ts` + migration | RLS contournée par le rôle superuser (SEC-09, PoC V-05). |
| Routes `approve` / `reject` | Code dupliqué ; décisions concurrentes possibles (ROB-02, PoC V-09). |

Avant de corriger l'un de ces points : vérifier son identifiant dans `tests/defects/registry.ts`, corriger l'application, passer `fixed: true`, puis relancer `npm run build && npx playwright test` et lire le résultat. Pour la feuille de route complète : `docs/audit/13-plan-remediation.md` et `docs/audit/20-audit-architecture-arla.md`.
