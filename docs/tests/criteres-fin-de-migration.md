# Critères de fin de migration — Expense.io

- **Pour qui** : l'équipe architecture (migration), l'équipe audit, et toute personne ou agent IA qui touche au code.
- **Rédigé par** : team Tests.
- **But** : dire, sans ambiguïté, ce qui doit être vrai pour considérer la migration d'architecture comme **terminée**, et comment le vérifier soi-même en une commande.
- **Références** : stratégie complète dans `docs/tests/specs/2026-10-12-strategie-tests-design.md`, mode d'emploi détaillé dans `tests/README.md`.

---

## 1. En une phrase

La migration est terminée quand **`make test` est vert sur `main`, que tous les défauts techniques sont marqués corrigés dans `tests/defects/registry.ts`, que le métier est totalement fonctionnel (§2.3), que les objectifs de `tests/perf/targets.json` sont atteints sans aucune régression de performance (`make test-perf`), et que la CI GitHub est verte**, sans qu'aucun test de parité n'ait été modifié pour y arriver, hors évolutions de comportement décidées au §2.3.

---

## 2. Définition de « terminé »

Cocher chaque ligne. Une seule case vide = migration non terminée.

### 2.1 Rien n'a été perdu (parité)

- [ ] Les **231 tests `@parity`** passent (253 avant que D12 ne fasse passer 22 cellules de la matrice en défauts) : `npx playwright test --grep @parity`.
- [ ] Toutes les réponses de l'API sont conformes au contrat **`docs/api/openapi.yaml`** : c'est vérifié automatiquement sur chaque réponse obtenue par les tests (schémas stricts, codes HTTP documentés).
- [ ] Aucun test `@parity` n'a été modifié, sauf changement de comportement **voulu** (§2.3), justifié dans la PR et validé par la team Tests.
- [ ] Le **contrat** ci-dessous est intact (il est vérifié par les tests, mais c'est lui qui compte) :

| Élément | Ce qui ne doit pas changer |
|---|---|
| Routes API | les 14 chemins et verbes d'origine (`/api/expense-notes`, `/api/manager/...`, `/api/hr/...`), plus `PUT /api/hr/users/{id}/role` (D14) et `GET /api/hr/me` (D13) ajoutés |
| Réponses | décrites dans `docs/api/openapi.yaml` : forme JSON (`id`, `userId`, `amount` en nombre, `expenseDate` en `YYYY-MM-DD`, `description`, `receiptKey`, `status`, `createdAt` ISO), codes HTTP, erreurs `{"error": "..."}` sans stack ; messages exacts, en anglais depuis D15 (`Invalid fields`, `Already decided`, `Invalid manager`, `Not found`…) |
| Suggestion OCR | sur les reçus de référence (`tests/fixtures/ocr/`), même montant et même date qu'avant |
| Tris | employé : `created_at` décroissant ; manager et RH : `created_at` croissant |
| Interface | textes français des labels et boutons (`Montant (€)`, `Soumettre`, `Approuver`, `Rejeter`, `Voir le reçu`, `Se connecter`, `Se déconnecter`…) |
| Exploitation | scripts npm (`dev`, `build`, `start`, `lint`, `typecheck`, `migrate:up`, `migrate:down`, `ensure-bucket`, `seed`), cibles make, variables de `.env.example`, ports 3000 / 5433 / 4567 |
| Données de démo | comptes `hr@expense.io`, `manager@expense.io`, `demo@expense.io` ; `npm run seed` relançable sans doublon ; overrides `SEED_*` |
| Comportements conservés volontairement | note hors périmètre → `404` (ne pas révéler l'existence d'une ressource) ; `/manager` et `/hr` avec un mauvais rôle → page « Accès réservé » (même titre, statut `403` depuis D19) ; une note en attente suit le nouveau manager après réaffectation |

### 2.2 Les défauts techniques sont corrigés

- [ ] Chaque identifiant de `tests/defects/registry.ts` (17 défauts techniques à l'origine, plus les défauts métier ajoutés au titre du §2.3) est passé à `fixed: true`.
- [ ] `make test-defects` est vert **après** ces bascules.

| ID | À corriger | Résultat attendu, vérifié par les tests |
|---|---|---|
| SEC-01 | `?sort=` concaténé dans le SQL | tri hors liste blanche → `400` ; **les tris légitimes restent acceptés** (voir §5) |
| SEC-02 | reçu manager sans contrôle de rattachement | manager hors périmètre → `404` |
| SEC-03 | assignation d'un manager d'une autre entreprise | → `409 {"error":"Invalid manager"}` |
| SEC-04 | secret de session écrit dans le code | plus aucun secret dans `src/` ; la session dépend de `AUTH_SECRET` |
| SEC-05 | stack trace dans les erreurs 500 | aucune `stack` ni chemin de fichier dans une réponse 5xx |
| ROB-02 | double décision simultanée | 20 décisions simultanées → exactement **une** `200`, les autres `409` (routes manager **et** RH) |
| ROB-03a | identifiant invalide dans l'URL → 500 | `404` sur les 8 routes à `:id` |
| ROB-03b | date invalide → 500 | `400` |
| ROB-03c | montant trop grand pour `numeric(10,2)` → 500 | `400` |
| ROB-03d | montant non numérique (`12abc`) accepté | `400` |
| ROB-03e | `PUT .../manager` sans JSON valide retire le manager | `400`, manager conservé |
| SEC-06 | clés de reçu séquentielles (`receipts/960.png`) | clé non devinable (au moins 16 caractères, pas un simple numéro), différente à chaque note |
| SEC-07 | type de reçu contrôlé sur le MIME déclaré | contenu qui n'est pas une image déclaré `image/png` → `400 {"error":"Type de fichier non autorisé pour le reçu"}` |
| SEC-08 | suggestion OCR sans limite de taille | fichier de plus de 10 Mo → `400 {"error":"Fichier trop volumineux"}` |
| SEC-09 | RLS inopérante (utilisateur de base superuser) | dans le contexte posé par l'app (`app.current_user_id`), la base ne renvoie que les notes de l'utilisateur — **décision archi**, voir §5 |
| ROB-01 | création de note non atomique | S3 indisponible → erreur 5xx **et** aucune note créée |
| BUG-01 | date affichée décalée d'un jour en fuseau négatif | en fuseau `America/New_York`, la date saisie `2026-03-12` s'affiche « 12 mars 2026 » |

Les objectifs de performance PERF-01 et PERF-02 sont suivis à part, dans `tests/perf/targets.json` (§2.4).

### 2.3 Le métier est totalement fonctionnel

Décision d'équipe du 2026-10-13 : les professeurs ont des tests qui échouent sur l'application d'origine et qu'ils attendent verts après la migration, probablement sur les comportements étranges. Les défauts métier MET-01 à MET-09 (spec §5.2) et les comportements inventoriés dans `docs/audit/22-comportements-a-corriger.md` sont donc **à corriger**.

* [ ] Le circuit complet fonctionne depuis l'interface, sans seed ni SQL : inscription d'une entreprise, nomination d'un manager par la RH, rattachement, soumission, validation, statut visible par l'auteur.
* [ ] Toute note a un valideur : employé sans manager, manager racine, RH (règle tranchée en D13).
* [ ] Codes HTTP standard : `401` si non connecté, `403` si connecté sans le rôle, sur toutes les routes `/api/manager/*` et `/api/hr/*`.
* [ ] Chaque point de `22-comportements-a-corriger.md` est soit corrigé, soit marqué « conservé » avec sa justification.
* [ ] Chaque correction suit le cycle rouge → vert : la team Tests ajoute d'abord le défaut au registre (`fixed: false`) avec son test, et fait évoluer dans la même PR les tests de parité et `docs/api/openapi.yaml` qui figeaient l'ancien comportement.
* [ ] Aucun texte d'interface existant renommé : on ajoute (menu, message, champ), on ne remplace pas.
* [ ] Seules les options tranchées dans `docs/audit/21-decisions-architecture.md` (D12 à D19) sont implémentées.

Décisions D12 à D19 tranchées le 2026-10-26, suivies par ces défauts du registre (tests dans `tests/defects/metier.spec.ts` et `tests/api/authz-matrix.ts`) :

| ID | Décision | Résultat attendu, vérifié par les tests |
|---|---|---|
| AUTHZ-01, AUTHZ-02 | D12 | `403` connecté sans le rôle sur `/api/manager/*`, `401` anonyme sur `/api/hr/*` |
| MET-03 | D13 | la RH se rattache à un manager (`GET /api/hr/me`, `PUT /api/hr/users/{son id}/manager`) qui valide ses notes ; jamais d'auto-validation |
| ROLE-01, ROLE-02, ROLE-03 | D14 | `PUT /api/hr/users/:id/role` (employé ↔ manager) et menu de rôle ; rétrogradation avec subordonnés → `409 Manager has direct reports` ; effet sans reconnexion |
| API-01 | D15 | messages de l'API en anglais (`Invalid fields`, `Receipt file type not allowed`, `File too large`), écran inchangé |
| MET-01 | D16 | inscription refusée sur un domaine de messagerie public |
| UI-01 | D17 | « Mes notes » : total par statut ajouté sous le total existant |
| MET-04 | D18 | cycle hiérarchique → `409 Invalid manager` |
| AUTHZ-03 | D19 | page « Accès réservé » servie en `403` |

### 2.4 Pas plus lent qu'avant

- [ ] Aucune régression de performance : le barème met **0** si l'application est moins performante.
- [ ] Objectifs atteints et déclarés `fixed: true` dans `tests/perf/targets.json` :

| ID | À corriger | Objectif mesuré |
|---|---|---|
| PERF-01 | worker Tesseract recréé à chaque requête | p95 de la suggestion OCR ≤ 50 % de la baseline |
| PERF-02 | aucun index sur les colonnes filtrées | p95 des listes employé, manager et RH ≤ 50 % de la baseline (200 000 notes) |

Vérification : `make test-perf` en local (environ 15 min), ou poser le label `perf` sur la PR (rapport commenté automatiquement). Détail, lecture du rapport et bruit mesuré : `docs/perf/README.md`.

### 2.5 Qualité et CI

- [ ] `npm run lint`, `npm run typecheck`, `npm run build` passent.
- [ ] Les jobs GitHub Actions `static`, `parity`, `defects` sont verts sur `main`.
- [ ] Le job `baseline-proof` est vert (il prouve que les tests restent valides contre l'application d'origine).

---

## 3. Ce qu'il ne faut pas faire

| Interdit | Pourquoi |
|---|---|
| Renommer un script npm, une cible make, une variable d'environnement ou changer un port | la CI des professeurs lance l'application avec ces noms : tout leur E2E tomberait |
| Modifier un texte de l'interface | les E2E (les nôtres et probablement ceux des professeurs) cherchent les éléments par leur texte |
| Modifier un test pour le faire passer | un test de parité rouge signale une régression, pas un test à « réparer » ; seule exception : un comportement étrange dont la correction est décidée au §2.3, modifié par la team Tests |
| Modifier `docs/api/openapi.yaml` pour faire passer un test | c'est le contrat de l'app d'origine ; une réponse « hors contrat » est une régression |
| Réenregistrer les références OCR (`OCR_RECORD=1`) | elles décrivent la sortie de l'app d'origine ; un écart est une régression de l'OCR |
| Passer `fixed: true` sans corriger | le test redevient normal et la CI passe au rouge |
| Supprimer ou casser `scripts/seed.mjs` | les comptes de démo font partie du contrat |
| Changer le schéma `users` / `companies` sans prévenir | `scripts/seed-e2e.mjs` (acteurs de test) doit suivre — voir §7 |

---

## 4. Lancer et vérifier

### 4.1 Prérequis

- Node.js 24+, Docker.
- `.env` présent (`make env` le crée depuis `.env.example`).
- Une fois : `npx playwright install chromium`.

### 4.2 Commandes

```bash
make test           # tout : Docker, migrations, seed, build de prod, puis parité + défauts
make test-api       # contrat HTTP + défauts
make test-e2e       # parcours dans le navigateur
make test-defects   # tableau rouge → vert des défauts
make test-report    # ouvre le rapport HTML du dernier run
make test-perf      # performance : baseline contre version courante (environ 15 min, k6)
make perf-aa        # performance : baseline contre elle-même (mesure du bruit)
make api-diff NEW=chemin/openapi.yaml   # changements cassants entre le contrat et une autre spec (oasdiff)
```

Contrat d'API : `docs/api/openapi.yaml`. Si votre nouvelle architecture **génère** sa spécification OpenAPI depuis le code (zod-openapi, etc.), comparez-la au contrat avec `make api-diff NEW=<votre spec>` : aucun changement cassant ne doit apparaître.

Perf : rapport dans `perf-results/latest.md`, lecture et seuils dans `docs/perf/README.md`. Sur GitHub, poser le label `perf` sur la PR.

Une fois l'environnement prêt (après un premier `make test`) :

```bash
npm run build                                          # toujours après une modification du code
npx playwright test tests/api/manager.spec.ts --no-deps   # un fichier
npx playwright test --grep @SEC-03                        # un défaut
npx playwright test --grep @parity                        # toute la parité
```

Important :

- Les tests attaquent le **build de production** (`next start`), jamais `next dev`. Toujours relancer `npm run build` après une modification.
- En local, si un serveur tourne déjà sur 3000 ou 3001, Playwright le réutilise : l'arrêter avant de lancer les tests, sinon on teste une ancienne version.
- `--no-deps` évite de relancer toute la suite quand on cible un fichier.

### 4.3 Lire le résultat

| Ce que vous voyez | Signification | Que faire |
|---|---|---|
| `✓` | test vert | rien |
| `✘` mais compté dans `passed` | défaut **attendu en échec** (`fixed: false`) | normal tant que le défaut n'est pas corrigé |
| `Expected to fail, but passed` | le défaut est corrigé mais toujours déclaré `fixed: false` | passer `fixed: true` dans le registre |
| `✘` compté dans `failed` sur un test `@parity` | **régression** | corriger le code, pas le test |
| `flaky` | test passé seulement au second essai | le signaler à la team Tests |

Rapport détaillé avec traces des échecs : `make test-report`.

**Pourquoi la CI est verte alors que des tests de défaut échouent ?** Tant qu'un défaut est `fixed: false`, son échec est attendu : c'est l'état « rouge » du cycle rouge → vert, enregistré au lieu de bloquer `main`. Quand le défaut est corrigé et déclaré `fixed: true`, le test devient un test normal et passe. À la fin de la migration, il n'y a plus aucun échec attendu. Détail et tableau des 4 situations : `tests/README.md`, section « Pourquoi la CI est verte alors que des tests de défaut échouent ».

### 4.4 Vérifier contre la baseline (optionnel, fait par la CI)

```bash
git worktree add ../expense-io-baseline baseline
cp .env ../expense-io-baseline/.env
(cd ../expense-io-baseline && npm ci && npm run build)
APP_DIR=../expense-io-baseline BASELINE=1 npx playwright test --grep "@parity|@defect"
```

Attendu : tout vert (la parité passe, les défauts sont en échec attendu).

---

## 5. Corriger un défaut : marche à suivre

1. Lancer le test du défaut : `npx playwright test --grep @SEC-01` → il est en échec attendu.
2. Corriger l'application.
3. Dans `tests/defects/registry.ts`, passer `fixed: true` pour cet identifiant.
4. `npm run build && npx playwright test --grep @SEC-01` → vert.
5. `make test` → tout vert (vérifier qu'aucun test de parité n'a cassé).
6. Ouvrir la PR : la CI rejoue tout, y compris la preuve sur la baseline.

Points d'attention par défaut :

| ID | Attention |
|---|---|
| SEC-01 | la liste blanche doit accepter les tris existants sous la forme `colonne DIRECTION`, avec `colonne` ∈ `created_at`, `amount`, `expense_date`, `description`, `status` et `DIRECTION` ∈ `ASC`, `DESC` (le test de parité utilise `amount ASC`) ; sans paramètre, `created_at DESC` |
| SEC-04 | lire `AUTH_SECRET` depuis l'environnement ; la variable est déjà dans `.env.example`, donc dans le `.env` créé par `make env` et dans la CI |
| SEC-05 | garder les mêmes codes HTTP ; seul le corps change (message générique, pas de `stack`) |
| ROB-02 | rendre la décision atomique (mise à jour conditionnée au statut `pending`) ; la seconde décision renvoie toujours `409 Already decided` |
| ROB-03 | codes attendus : identifiant invalide → `404` (même réponse qu'une note inexistante), entrée invalide → `400 {"error":"Champs invalides"}` |
| SEC-06 | `scripts/seed.mjs` construit lui-même les clés des notes de démo (`receipts/<n>.png`) : sans effet sur le test, mais à aligner pour la cohérence |
| SEC-07 | vérifier le contenu réel du fichier (signature PNG, JPEG, WebP, PDF) ; les vrais fichiers doivent rester acceptés, y compris un PNG de 10 Mo complété par des zéros |
| SEC-08 | même limite et même message que la création de note (`Fichier trop volumineux`) |
| SEC-09 | deux options : rendre la RLS effective (rôle de base sans privilège, par exemple `SET LOCAL ROLE` exposé via la variable `APP_DB_ROLE`) **sans changer `DATABASE_URL`**, ou retirer la RLS et l'assumer (le test est alors supprimé avec la team Tests) |
| ROB-01 | ne pas laisser de note sans reçu : téléverser avant d'insérer, ou annuler l'insertion si le téléversement échoue |
| BUG-01 | une date `YYYY-MM-DD` n'est pas un instant : l'afficher sans conversion de fuseau |
| PERF-01 | réutiliser un worker (ou un pool) Tesseract au lieu d'en créer un par requête |
| PERF-02 | ajouter les index dans une **nouvelle** migration (ne pas modifier la migration initiale) |

---

## 6. Avant la soutenance

- [ ] Tous les points du §2 cochés.
- [ ] Tag `soutenance` posé sur `main` : la CI fait une exécution complète et produit les rapports.
- [ ] Rapport Playwright de ce run archivé (artefact GitHub `playwright-report-*`).
- [ ] Le tableau rouge → vert (`tests/defects/registry.ts`, techniques et métier) et l'inventaire des comportements corrigés (`docs/audit/22-comportements-a-corriger.md`) sont prêts pour les slides.
- [ ] Comparaison de performance finale lancée (`make test-perf` ou label `perf` sur la dernière PR) : `perf-results/latest.md` archivé, PERF-01 et PERF-02 à `fixed: true`, aucune régression ; courbe de progression (`docs/perf/trend.md` sur la branche `perf-history`) prête pour les slides.
- [ ] La démo de co-conception IA a été répétée : test E2E écrit d'abord (rouge) → implémentation assistée → CI verte.

---

## 7. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `tests/.generated/actors.json introuvable` | le seed de test n'a pas tourné | `npm run seed:e2e` |
| `Connexion refusée pour ...@a.e2e.test` | acteurs de test absents ou schéma modifié | `npm run seed:e2e` ; si le schéma `users` / `companies` a changé, adapter `scripts/seed-e2e.mjs` avec la team Tests |
| Tous les tests échouent au démarrage | Postgres ou LocalStack pas prêts | `make up` puis relancer |
| `UntrustedHost` dans les logs | `AUTH_TRUST_HOST` absent en production | la config Playwright et la CI le fournissent ; en lancement manuel : `AUTH_TRUST_HOST=true npm run start` |
| Tests verts mais changement non pris en compte | serveur ou build périmé | arrêter les serveurs sur 3000 / 3001, `npm run build`, relancer |
| Un test de parité casse alors que le changement est voulu | changement de comportement | le justifier dans la PR et demander à la team Tests d'adapter le test |
| `Réponse hors contrat (docs/api/openapi.yaml)` | champ ajouté, retiré ou mal typé, code HTTP non documenté, stack trace dans une erreur | corriger la réponse ; le message liste l'écart exact |
| Test OCR `sortie identique à la référence` en échec | l'extraction du montant ou de la date a changé (ex. réécriture du worker Tesseract pour PERF-01) | corriger l'OCR, ne pas réenregistrer les références |
| `Le port 3100 est déjà occupé` (perf) | serveur d'une mesure interrompue | `lsof -tiTCP:3100 -sTCP:LISTEN \| xargs kill`, puis relancer |
| Perf : `régression` sur un scénario | ralentissement réel, ou bruit sur une machine chargée | relancer `make test-perf` machine au repos ; si la régression persiste, c'est un vrai ralentissement à corriger |
| Perf : scénario `instable` | trop de dispersion entre passages | relancer ; augmenter `PERF_RUNS` ou `PERF_DURATION` |
| Perf : `seed-perf` échoue après une migration | schéma modifié, ou base accédée sans privilège (SEC-09) | adapter `scripts/seed-perf.mjs` avec la team Tests (il doit rester compatible avec la baseline) |

Contact : team Tests, via la PR concernée.
