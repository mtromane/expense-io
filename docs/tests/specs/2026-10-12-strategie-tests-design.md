# Stratégie de tests — Expense.io (team Tests)

- **Date** : 2026-10-12
- **Statut** : design validé en séance, spec en relecture
- **Périmètre** : harnais de validation qui garantit la non-régression pendant la migration d'architecture, prouve la correction des défauts techniques et mesure l'évolution des performances.

---

## 1. Contexte

Expense.io est l'application de référence du TD d'architecture logicielle. Les équipes l'auditent puis migrent son architecture. Les professeurs exécutent ensuite une batterie E2E cachée (plus d'autres tests non annoncés).

**Stack** : Next.js 16 (App Router) + React 19, Auth.js v5 (credentials, JWT), PostgreSQL 16 (`pg`, `node-pg-migrate`, RLS), S3 via LocalStack (URLs présignées), OCR local tesseract.js.

**Surface** : 14 endpoints métier, 3 server actions (`signup`, `login`, `logout`), 6 pages.

| # | Endpoint | Acteur visé |
|---|---|---|
| 1 | `GET /api/expense-notes` | tout utilisateur connecté (ses notes) |
| 2 | `POST /api/expense-notes` | tout utilisateur connecté |
| 3 | `GET /api/expense-notes/:id/receipt-url` | propriétaire |
| 4 | `POST /api/expense-notes/receipt-suggestion` | tout utilisateur connecté |
| 5 | `GET /api/manager/expense-notes` | manager |
| 6 | `POST /api/manager/expense-notes/:id/approve` | manager |
| 7 | `POST /api/manager/expense-notes/:id/reject` | manager |
| 8 | `GET /api/manager/expense-notes/:id/receipt-url` | manager |
| 9 | `GET /api/hr/expense-notes` | hr_admin |
| 10 | `POST /api/hr/expense-notes/:id/approve` | hr_admin |
| 11 | `POST /api/hr/expense-notes/:id/reject` | hr_admin |
| 12 | `GET /api/hr/expense-notes/:id/receipt-url` | hr_admin |
| 13 | `GET /api/hr/users` | hr_admin |
| 14 | `PUT /api/hr/users/:id/manager` | hr_admin |

**État initial** : aucun test, aucun outil de test. Les dossiers `domain/`, `ports/`, `adapters/`, `utils/` sont du code mort (aucun import) : la logique vit dans les routes, en SQL direct, dupliquée.

### Barème (extrait utile à la team Tests)

| Critère | Attendu qui nous concerne |
|---|---|
| Qualité technique /5 | 100 % des tests E2E fonctionnent toujours ; outillage qualitatif ; code documenté pour l'humain et le LLM ; **0 si l'application est moins performante** |
| Co-conception IA /3 | « l'outillage permet d'être serein » ; 1/3 si « pas de harnais en validation » |
| Audit /5 | rapports chiffrés, hiérarchie des problématiques |
| Présentation /3 | visuels clairs, niveau CTO |
| Questions /4 | capacité à approfondir |

---

## 2. Objectifs et critères de succès

1. **Parité** : tout comportement légitime de la version initiale est figé par un test vert sur `baseline` et reste vert après migration.
2. **Défauts techniques** : chaque défaut technique a un test rouge sur `baseline`, vert après correction.
3. **Défauts métier** : documentés et caractérisés ; correction suspendue à la réponse des professeurs.
4. **Performance** : aucune régression au-delà du bruit mesuré ; gains chiffrés par rapport à `baseline`.
5. **Harnais** : une commande (`make test`), moins de 5 minutes en CI, gate bloquant sur les PR, documenté pour les agents IA.

**Critères de succès mesurables**

- 14/14 endpoints et 7 acteurs couverts par la matrice d'autorisations.
- `baseline-proof` vert : tous les tests `@parity` passent sur `baseline`, tous les tests `@defect` y échouent.
- À la soutenance : 100 % `@parity` vert, défauts techniques corrigés N/N, rapport de perf A/B publié.

## 3. Contraintes (hypothèse validée « b »)

Contrat à préserver, encodé en tests :

- routes API, verbes, codes HTTP, forme JSON, messages d'erreur exacts, ordres de tri ;
- textes de l'interface (labels et boutons français, sélecteurs probables des E2E professeurs) ;
- scripts npm et cibles make, noms des variables d'environnement (`.env.example`), ports 3000 / 5433 / 4567 ;
- comptes seed (`hr@`, `manager@`, `demo@expense.io`), idempotence du seed, overrides `SEED_*` ;
- stack Next.js / PostgreSQL / S3.

**Incohérences conservées pour parité** (documentées, non corrigées) :

- mauvais rôle → `401` sur les routes manager, `403` sur les routes RH, y compris anonyme ;
- note hors périmètre → `404` (pas `403`) ;
- `/manager` et `/hr` avec un mauvais rôle → page 200 « Accès réservé ».

## 4. Non-objectifs

- Tests unitaires sur le code actuel (destiné à être réécrit). Vitest n'interviendra que sur le nouveau domaine.
- Correction des défauts métier avant décision des professeurs.
- Bonnes pratiques génériques hors contexte (rate limiting, révocation de session) : mentionnées dans l'audit, non testées.

---

## 5. Classification des défauts

### 5.1 Techniques — corriger, test rouge → vert (`@defect`)

| ID | Défaut | Localisation | Test attendu (vert après fix) | Prio |
|---|---|---|---|---|
| SEC-01 | Injection SQL via `?sort=` concaténé dans `ORDER BY` | `src/app/api/expense-notes/route.ts:42` | tri hors liste blanche → 400 ; tris légitimes inchangés | P0 |
| SEC-02 | Reçu manager sans contrôle de rattachement | `src/app/api/manager/expense-notes/[id]/receipt-url/route.ts:17` | manager hors périmètre → 404 | P0 |
| SEC-03 | Assignation d'un manager d'une autre entreprise | `src/app/api/hr/users/[id]/manager/route.ts:39` | → 409 `Invalid manager` | P0 |
| SEC-04 | `AUTH_SECRET` en dur, variable d'environnement ignorée | `src/lib/auth.ts:8` | jeton émis avec l'ancien secret refusé ; aucun secret dans `src/` | P0 |
| SEC-05 | Stack trace renvoyée dans les 500 | `src/lib/errors.ts:5` | toute 5xx sans `stack` ni détail interne | P0 |
| SEC-06 | Clés de reçu séquentielles et prévisibles | `src/lib/storage.ts:25` | deux notes consécutives → clés non devinables | P1 |
| SEC-07 | Type de reçu validé sur le MIME déclaré par le client | `src/app/api/expense-notes/route.ts:81` | contenu non conforme déclaré `image/png` → 400 | P1 |
| SEC-08 | OCR sans limite de taille | `src/app/api/expense-notes/receipt-suggestion/route.ts:18` | > 10 Mo → 400 immédiat | P1 |
| SEC-09 | RLS inopérante (utilisateur DB superuser) | `src/lib/db.ts:23`, `docker-compose.yml:6` | le rôle d'exécution ne voit que les lignes autorisées — **dépend de la décision archi** (rendre effective ou retirer) | P1 |
| ROB-01 | Création de note non atomique (S3 hors transaction) | `src/app/api/expense-notes/route.ts:88` | S3 indisponible → 5xx et aucune note créée | P1 |
| ROB-02 | Double décision concurrente (SELECT puis UPDATE sans condition) | `src/app/api/manager/expense-notes/[id]/approve/route.ts:28` (+3) | 20 décisions simultanées → exactement une 200 par note | P0 |
| ROB-03 | Entrées invalides → 500 ou effet silencieux | plusieurs routes | voir 5.1.1 → 400/404, jamais 500, aucun effet | P0 |
| PERF-01 | Worker Tesseract recréé à chaque requête | `src/lib/ocr.ts:118` | p95 OCR ≤ 50 % de `baseline` | P1 |
| PERF-02 | Aucun index sur `user_id`, `manager_id`, `company_id`, `status` | `migrations/1700000000001_init-schema.sql` | p95 des listes sur gros volume ≤ 50 % de `baseline` | P1 |
| BUG-01 | Date affichée décalée d'un jour en fuseau négatif | `src/app/expenses/page.tsx:285` | E2E en `America/New_York` → date exacte | P1 |

#### 5.1.1 Cas ROB-03

1. UUID invalide dans un paramètre de route → 404 (aujourd'hui 500).
2. `expenseDate` invalide → 400 (aujourd'hui 500).
3. Montant au-delà de `numeric(10,2)` → 400 (aujourd'hui 500).
4. Montant non numérique (`"12abc"`) → 400 (aujourd'hui accepté comme 12).
5. `PUT /api/hr/users/:id/manager` sans JSON valide → 400 (aujourd'hui désassigne silencieusement le manager).

**Risques de parité à surveiller** : SEC-04 exige que la CI des professeurs fournisse `AUTH_SECRET` (présent dans `.env.example`, probable) ; SEC-06 change le format de `receiptKey`, exposé dans le JSON, et impose d'aligner `scripts/seed.mjs`.

### 5.2 Métier — documenter, caractériser, attendre (`@metier`)

| ID | Constat |
|---|---|
| MET-01 | Premier inscrit d'un domaine = RH, sans vérification d'email, y compris domaines publics. **Impact sécurité fort, à poser en priorité.** |
| MET-02 | Employé inscrit seul (sans manager) : ses notes ne sont visibles par aucun valideur. |
| MET-03 | Les notes d'un RH ne sont jamais validables. |
| MET-04 | Cycle hiérarchique possible (A manage B, B manage A) → validation croisée. **Risque de fraude.** |
| MET-05 | Email sensible à la casse : doublons possibles, login sensible à la casse. |
| MET-06 | Aucune règle de saisie : date future, arrondi silencieux au-delà de 2 décimales, pas de plafond, description sans limite. |
| MET-07 | Réassignation de manager : les notes en attente suivent le nouveau manager. |
| MET-08 | Le manager voit l'identifiant tronqué de l'employé, pas son nom. |
| MET-09 | Décision jamais notifiée (`NotificationPort` jamais appelé) ; pas de motif de rejet ni d'historique. |

**Mécanique** : pour chaque MET, un test de caractérisation actif (comportement actuel, vert) et la version corrigée écrite en `test.fixme`. Décision des professeurs « corriger » → bascule et cycle rouge → vert ; « ne pas corriger » → statu quo. Suivi dans `docs/tests/questions-metier.md`.

---

## 6. Architecture du harnais

### 6.1 Outils

| Besoin | Outil |
|---|---|
| API et UI boîte noire | Playwright Test (`request` + navigateur) |
| Performance | k6 via l'image Docker `grafana/k6` |
| Unitaire | Vitest, uniquement sur le nouveau domaine (après migration) |

### 6.2 Environnement d'exécution

- Application toujours en build de production (`npm run build && npm run start`), jamais `next dev`.
- `webServer` Playwright démarre l'application si le port 3000 est libre.
- Setup global via les commandes du repo : `docker compose up -d` → `npm run migrate:up` → `npm run ensure-bucket` → `npm run seed` → `node scripts/seed-e2e.mjs`.
- Instance de panne sur le port 3001 avec `S3_ENDPOINT` pointant vers un port fermé (ROB-01, SEC-05).
- Fuseau `Europe/Paris` par défaut ; `America/New_York` pour BUG-01.

### 6.3 Arborescence

```
playwright.config.ts
scripts/
  seed-e2e.mjs        # acteurs de test (lit tests/fixtures/dataset.json)
  seed-perf.mjs       # gros volume, graine aléatoire fixe
tests/
  support/
    auth.ts           # connexion via /api/auth/csrf + /api/auth/callback/credentials
    actors.ts         # accès typé aux acteurs du dataset
    notes.ts          # création de notes via l'API
    normalize.ts      # UUID, dates, séquences → placeholders
  fixtures/
    dataset.json      # entreprises, utilisateurs, hiérarchie
    receipts/         # png, jpg, webp, pdf, faux png, images OCR (le > 10 Mo est généré)
  api/                # contrat HTTP, matrice d'autorisations (authz-matrix.ts)
  e2e/                # parcours UI + _template.spec.ts
  ops/                # contraintes d'exploitation
  defects/            # SEC/ROB/BUG — test.fail() jusqu'au fix
  metier/             # MET — caractérisation + fixme
  golden/             # réponses JSON de référence
  perf/               # scénarios k6, compare.mjs, trend.mjs
  report/             # defects-board.mjs, générateurs de docs
```

### 6.4 Jeu de données de test (`seed-e2e`)

Script idempotent sur le modèle de `scripts/seed.mjs`, piloté par `tests/fixtures/dataset.json`. Il crée **uniquement des acteurs** (le rôle manager est impossible à créer via l'interface).

```
Entreprise A (a.e2e.test)              Entreprise B (b.e2e.test)
├─ RH A                                ├─ RH B
├─ Manager racine A                    ├─ Manager racine B
│  └─ Sous-manager A                   │  └─ Employé B
│     └─ Employé A1, Employé A2
├─ Employé sans manager      (MET-02)
├─ Paire A / A' pour le cycle (MET-04)
└─ Acteurs dédiés, un par test qui modifie la hiérarchie
```

Règles :

- les notes sont créées par chaque test via `POST /api/expense-notes`, avec une description unique ;
- un test qui modifie la hiérarchie utilise des acteurs qui lui sont réservés ;
- les vérifications passent par l'API, jamais par SQL ;
- seul SEC-09 accède directement à la base.

### 6.5 Conventions

- Tags : `@parity`, `@defect SEC-02`, `@metier MET-04` ; filtrage `--grep`.
- Un contexte HTTP authentifié par acteur.
- Tag git `baseline` sur le commit initial `265924b`.

### 6.6 Commandes

```
make test          # @parity + @metier + @defect
make test-api
make test-e2e
make test-defects
make test-perf     # comparaison A/B contre baseline
make perf-compare  # identique, en local
make test-report
```

---

## 7. Catalogue des tests de parité (`@parity`)

### 7.1 API

| ID | Contenu | Prio |
|---|---|---|
| AUTHZ | Matrice data-driven 14 endpoints × 7 acteurs (anonyme, employé, autre employé, manager, autre manager, RH, RH B) | P0 |
| AUTH | Login des 3 comptes seed ; mauvais mot de passe ; signup : 1er du domaine → RH + entreprise, suivant → employé, email existant, mot de passe < 8, email invalide (messages exacts) | P0 |
| EMP | Création 201 et forme JSON ; png/jpg/webp/pdf acceptés, gif → 400 ; 10 Mo pile OK, +1 octet → 400 ; champs manquants, montant ≤ 0, description vide → `Champs invalides` ; liste `created_at DESC` ; tris légitimes | P0 |
| RCPT | URL de reçu → mêmes octets et même content-type (employé, manager, RH) ; note d'autrui → 404 | P0 |
| MGR | Liste = notes en attente des rattachés directs (pas N-2), tri ASC ; approve/reject ; seconde décision → 409 `Already decided` ; hors périmètre → 404 | P0 |
| HR | Liste = managers racine de l'entreprise ; décisions, 409, 404 ; annuaire employés + managers triés par nom, sans RH ; assignation 200, `null` → racine, soi-même → 409, non-manager → 409, cible d'une autre entreprise → 404 | P0 |
| OCR | Images de référence → `{amount, expenseDate}` comparés au golden ; PDF → `{}` ; champ non fichier → 400 | P1 |
| GOLD | Réponses JSON normalisées comparées aux références enregistrées sur `baseline` | P1 |

### 7.2 UI

| ID | Parcours | Prio |
|---|---|---|
| E2E-01 | Signup → `/expenses`, état vide | P0 |
| E2E-02 | Login des 3 rôles → liens de navigation ; logout → `/login` | P0 |
| E2E-03 | Soumission d'une note → historique, total, badge « en attente » | P0 |
| E2E-04 | Manager approuve / rejette → l'employé voit « approuvée » / « rejetée » | P0 |
| E2E-05 | RH assigne un manager → le manager voit les notes ; RH tranche une note de manager racine | P0 |
| E2E-06 | « Voir le reçu » ouvre le reçu | P1 |
| E2E-07 | « Pré-remplir depuis le reçu » remplit montant et date ; message si rien n'est reconnu | P1 |
| E2E-08 | Gardes : anonyme → `/login` ; mauvais rôle → « Accès réservé » ; connecté sur `/` → `/expenses` | P0 |

### 7.3 Exploitation

| ID | Contenu | Prio |
|---|---|---|
| OPS-01 | Scripts npm et cibles make attendus présents | P0 |
| OPS-02 | `seed` lancé deux fois sans doublon ; overrides `SEED_*` respectés | P0 |
| OPS-03 | `migrate:up` et `ensure-bucket` idempotents | P1 |
| OPS-04 | Ports et variables de `.env.example` effectivement utilisés | P1 |
| OPS-05 | `lint`, `typecheck`, `build` passent | P0 |

**Volume estimé** : environ 230 tests (API ~170 dont matrice ~100, UI ~12, exploitation ~8, défauts ~22, métier ~18).

---

## 8. Performance

### 8.1 Données

`scripts/seed-perf.mjs`, base dédiée `expense_io_perf`, graine aléatoire fixe : 20 entreprises, environ 2 000 utilisateurs, 200 000 notes ; employés à 1 000 notes, managers à 50 rattachés ; reçus pointant vers quelques objets S3 partagés.

### 8.2 Scénarios k6

| ID | Charge | Rôle |
|---|---|---|
| P-EMP | `GET /api/expense-notes` (employé, 1 000 notes) | PERF-02 |
| P-MGR / P-HR | listes en attente sur gros volume | PERF-02 |
| P-USERS | annuaire RH | garde-fou |
| P-CREATE | `POST` d'une note avec petit PNG | garde-fou |
| P-OCR | suggestion OCR, séquentiel puis 5 en parallèle | PERF-01 |
| P-MIX | montée à 50 utilisateurs virtuels pendant 2 min | erreurs, saturation du pool |
| P-LOGIN | connexion | mesure seule ; le coût bcrypt ne doit pas baisser |

Métriques : p50, p95, p99, débit, taux d'erreur, mémoire et CPU du processus Node, démarrage à froid.

### 8.3 Comparaison A/B automatisée

Référence = la version `baseline` **remesurée à chaque fois**, jamais un chiffre stocké. Seul compte le ratio nouvelle / ancienne mesuré sur la même machine.

`tests/perf/compare.mjs` :

1. `git worktree` sur `baseline` ; build de production des deux versions.
2. Base fraîche par version, migrations propres à chaque version, même jeu de données.
3. Exécutions alternées A, B, A, B, A, B ; 30 s de chauffe ; médiane de 3 passages.
4. Export k6 JSON → ratio par scénario.
5. Sorties : `perf-results/<date>-<sha>.json` (bruts, ratios, informations machine) et `perf-results/<sha>.md`.

**Calibration** : un test A/A (`baseline` contre elle-même) mesure le bruit du runner ; le seuil de régression est fixé au-dessus de ce bruit (10 % visé). Un scénario dont la dispersion dépasse le seuil est marqué « instable » plutôt que rouge.

**Seuils** :

- non-régression, tous scénarios : p95 courant ≤ 1,10 × p95 `baseline` ;
- amélioration PERF-01 et PERF-02 : p95 ≤ 50 % de `baseline` (valeur ajustée après la première mesure).

**Historique** : chaque exécution sur `main` ajoute une ligne à `docs/perf/history.jsonl` (ou branche `perf-history`). `tests/perf/trend.mjs` trace le ratio par scénario au fil des PR de migration.

**Livrable** : `docs/perf/rapport-final.md` (`baseline` contre version finale, gain par scénario relié à son ID d'audit, bruit mesuré, courbe).

## 9. Robustesse

| ID | Méthode | Prio |
|---|---|---|
| ROB-01 / SEC-05 | instance 3001 avec S3 indisponible → 5xx, pas de `stack`, aucune note créée | P0 |
| ROB-01b | instance avec base indisponible → 5xx sans stack | P2 |
| ROB-02 | 20 décisions simultanées × 5 notes ; rouge sur `baseline` si une note a plus d'une décision réussie | P0 |
| ROB-03 | entrées invalides pilotées par table (5.1.1) | P0 |
| ROB-FUZZ | fast-check sur `POST /api/expense-notes` : jamais de 500 | P2 |
| ROB-SIGNUP | deux signups simultanés sur un nouveau domaine → un seul RH | P2 |
| ROB-LEAK | 100 appels OCR consécutifs → mémoire stable | P2 |

ROB-02 est probabiliste sur `baseline` (5 notes × 20 requêtes rendent le rouge quasi certain) et déterministe après correction.

---

## 10. Intégration continue (GitHub Actions)

### 10.1 Jobs

| Job | Contenu | Bloquant |
|---|---|---|
| `changes` | filtre de chemins (`dorny/paths-filter`) | — |
| `static` | lint, typecheck, build | oui |
| `parity` | services, migrations, seeds, start, `@parity` + `@metier` | oui (100 %) |
| `defects` | `@defect` | oui |
| `baseline-proof` | tests nouveaux ou modifiés rejoués sur `baseline` : `@parity` vert, `@defect` rouge | oui si `tests/` change |
| `perf` | comparaison A/B (section 8) | label `perf` ou nocturne |

Un test `test.fail()` qui passe fait échouer la CI : impossible d'oublier de basculer un défaut corrigé.

### 10.2 Déclencheurs

| Événement | Jobs |
|---|---|
| PR ouverte / nouveau commit | `static`, `parity`, `defects`, `baseline-proof` si `tests/` change |
| PR en brouillon | `static` |
| push sur `main` | `static`, `parity`, `defects` |
| label `perf` | `perf` |
| nocturne 02:00 sur `main` | tout (P0 à P2), `baseline-proof` complet, `perf`, historique |
| manuel (`workflow_dispatch`) | au choix |
| tag `soutenance` | tout + rapports finaux |

`concurrency` avec `cancel-in-progress` par PR. Jobs sautés par le filtre de chemins marqués réussis pour ne pas bloquer les checks obligatoires.

**Budget** : environ 1 400 min/mois estimées. Illimité si repo public ; 2 000 (Free) ou 3 000 (Pro / Student Pack) si privé. Repli : nocturne un jour sur deux, perf à la demande.

### 10.3 Protection de `main` et propriété

- Checks obligatoires : `static`, `parity`, `defects`.
- `CODEOWNERS` : `tests/`, `playwright.config.ts`, `scripts/seed-e2e.mjs`, `docs/tests/`, `.github/` → revue team Tests (Romane, Lukas, Thibault). Bloquant uniquement si la protection de `main` exige la revue des code owners.
- Modifier un test `@parity` = changer un comportement : justification obligatoire dans la PR.

### 10.4 Tests instables

`retries: 1` en CI ; un test qui ne passe qu'au second essai est signalé « flaky » dans le résumé. Tag `@quarantine` avec issue, 48 h maximum, jamais sur un P0.

### 10.5 Rapports

Rapport HTML Playwright et traces en artefacts ; résumé du job avec compteurs, tableau des défauts, lien vers le rapport de perf.

## 11. Fonctionnement avec l'équipe archi

1. **Phase 0** (en parallèle de l'audit) : filet P0 vert sur `baseline`. Aucune PR de migration fusionnée avant.
2. Migration par petites PR (approche strangler), chacune passant le gate.
3. Correction d'un défaut : la PR de fix retire le `test.fail()` du test concerné.
4. Réponse des professeurs sur un MET : la team Tests bascule caractérisation / version corrigée et met à jour `questions-metier.md`.

### Préparation de la co-conception IA

- `CLAUDE.md` et `AGENTS.md` : `make test` obligatoire avant de déclarer une tâche terminée ; ne jamais modifier `tests/` pour faire passer un test ; procédure d'ajout de scénario.
- `tests/e2e/_template.spec.ts` et procédure « nouvelle fonctionnalité » : test E2E d'abord (rouge) → extension du dataset si besoin → implémentation assistée → harnais vert.
- Hook pre-push optionnel : lint, typecheck, `@parity` API.

---

## 12. Livrables

### 12.1 Documentation

| Fichier | Contenu | Mode |
|---|---|---|
| `tests/README.md` | exécution, tags, dataset, ajout de scénario | manuel |
| `CLAUDE.md`, `AGENTS.md` | règles pour agents IA | manuel |
| `docs/tests/strategie.md` | stratégie condensée | manuel |
| `docs/tests/adr/` | ADR-T01 Playwright boîte noire, ADR-T02 seed-e2e, ADR-T03 perf A/B + A/A | manuel |
| `docs/tests/matrice-autorisations.md` | endpoint × acteur → code, heatmap | généré depuis `tests/api/authz-matrix.ts` |
| `docs/tests/tracabilite.md` | règle / exigence → tests | généré depuis les tags |
| `docs/tests/defects-board.md` | tableau rouge → vert | généré par la CI |
| `docs/tests/questions-metier.md` | MET-01 à 09 : constat, risque, question, état | manuel |
| `docs/perf/rapport-final.md`, `docs/perf/history.jsonl` | performance A/B | généré |

### 12.2 Soutenance

- **Audit** : défauts classés par sévérité (impact × exploitabilité), couverture 14/14 × 7, nombre de tests par famille, gains de perf avec bruit mesuré.
- **Présentation** : schéma du harnais, tableau rouge → vert, perf avant/après + courbe, heatmap des autorisations.
- **Questions** : fiche Q&R team Tests (pas d'unitaires sur l'ancien code, `test.fail()`, calibration A/A, RLS et superuser, UPDATE conditionnel, limites de la boîte noire).
- **Co-conception IA** : démonstration répétée (test rouge → dataset → implémentation assistée → CI verte).
- **Qualité technique** : exécution complète verte sur le tag `soutenance`.

---

## 13. Ordonnancement

| Lot | Contenu | Condition de sortie |
|---|---|---|
| L0 | Tag `baseline`, Playwright, `seed-e2e`, support (auth, acteurs, notes), commandes make | `make test` exécute un test vide en CI |
| L1 (P0) | AUTHZ, AUTH, EMP, RCPT, MGR, HR, E2E-01/02/03/04/05/08, OPS-01/02/05, CI `static` + `parity` | vert sur `baseline` ; gate actif |
| L2 (P0) | Défauts SEC-01 à 05, ROB-02, ROB-03 ; job `defects` ; `baseline-proof` | rouges sur `baseline`, CI verte (`test.fail`) |
| L3 (P1) | OCR, GOLD, E2E-06/07, OPS-03/04, défauts P1, MET-01 à 09, `questions-metier.md` | idem |
| L4 (P1) | Perf : `seed-perf`, scénarios k6, `compare.mjs`, A/A, job `perf`, historique | rapport A/B `baseline` contre `baseline` publié |
| L5 | Documentation générée, `CLAUDE.md` / `AGENTS.md`, gabarit, ADR, fiche Q&R | docs à jour depuis la CI |
| L6 (P2) | ROB-01b, FUZZ, SIGNUP, LEAK | — |

## 14. Risques

| Risque | Mitigation |
|---|---|
| Les E2E professeurs testent une chose non couverte | couverture exhaustive des endpoints et parcours ; contrat (b) figé |
| Seed et dataset cassés par une évolution de schéma | couplage concentré dans `seed-*.mjs` ; même statut que `seed.mjs` |
| CI des professeurs sans `AUTH_SECRET` après SEC-04 | variable présente dans `.env.example` ; à confirmer avec l'équipe archi |
| Format de `receiptKey` modifié par SEC-06 | aucun test de parité n'impose le format séquentiel ; seed aligné |
| Bruit des mesures de perf | A/A, alternance, médiane, statut « instable » |
| ROB-02 non reproduit sur `baseline` | 5 notes × 20 requêtes ; échec de `baseline-proof` signalé et analysé |
| Quota de minutes CI | filtre de chemins, brouillons légers, nocturne espacé |

## 15. Questions ouvertes

1. Décisions des professeurs sur MET-01 à MET-09.
2. Décision archi sur SEC-09 (rendre la RLS effective ou la retirer).
3. Visibilité du repo (public / privé) pour le budget CI.
