---
name: feature
description: À utiliser pour ajouter ou modifier une fonctionnalité d'Expense.io, en particulier pendant le live coding de la soutenance (énoncé imposé par le jury) - nouvelle route, nouveau champ, nouvel écran, nouvelle règle métier, notification ou traitement asynchrone.
argument-hint: <énoncé de la fonctionnalité>
---

# Ajouter une fonctionnalité (live coding)

Fonctionnalité demandée : $ARGUMENTS

Budget : 15 minutes devant le jury. Chaque étape laisse une preuve visible : décision écrite, test rouge, test vert, commandes lancées et lues. Les règles sont dans `AGENTS.md`, la recette détaillée dans `docs/architecture/ajouter-une-fonctionnalite.md` (les « § » ci-dessous y renvoient).

Dans ce dépôt, cette skill remplace les skills génériques de conception et de plan (`superpowers:brainstorming`, `superpowers:writing-plans`…). On n'écrit pas de document de conception, on ne pose pas de questions une par une, et on ne prévoit qu'un seul point de validation humaine : l'étape 1.

## 1. Cadrage, puis attendre le « go »

1. Lis la recette et le `README.md` du module visé.
2. Lis le code du cas d'usage le plus proche (`application/`, `infrastructure/`).
3. Cherche dans les tests tout ce que la fonctionnalité touche : `grep -rn "<route|texte du bouton|champ>" tests/`. Ces tests `@parity` décrivent l'existant qui ne doit pas bouger.
4. Réponds avec ce bloc rempli (15 lignes au plus) :

```text
Module          : <module> : <pourquoi, en une phrase (§0)>
Comportement    : <cas nominal> ; refus : <codes et messages en anglais (§4)>
Contrat         : <nouvelle route VERBE /chemin (préférée, §8) | champ ajouté à … | les deux | aucun>
Base            : <aucune | migration : … (§5, « Changer le schéma »)>
Interface       : <aucune | écran, bouton et textes français ajoutés (§7)>
Synchrone ?     : <oui | outbox, car lent ET service externe (AGENTS.md, ADR-008)>
Existant        : <tests @parity touchés et comment ils restent verts>
Identifiant     : FEAT-<nn> : <titre du registre>
Fichiers        : <liste par couche : tests, domain, ports, application, infrastructure, index, route, UI, contrat>
```

- **Existant** : si l'énoncé rend obligatoire ou modifie un comportement couvert par un `@parity`, on **ajoute** un chemin (nouvelle route, nouveau bouton) et on garde l'ancien tel quel (`AGENTS.md`, règle 5). Dis-le au jury dans le cadrage.
- **Identifiant** : si l'énoncé recoupe un `MET-xx` ou un `B-xx` de `docs/audit/22-comportements-a-corriger.md`, ou un point de `docs/audit/14-hors-perimetre.md`, cite-le. Sinon, numérote `FEAT-01`, `FEAT-02`… Propose d'acter la décision en une ligne dans `docs/audit/21-decisions-architecture.md` (« D<n>, énoncé du jury »).
- **Énoncé ambigu** : pose une seule question et propose ton choix par défaut.
- **Option non tranchée** : si la fonctionnalité dépend d'une option non tranchée dans `docs/audit/21-decisions-architecture.md`, dis-le et propose de la trancher maintenant.

Ensuite, attends la validation avant d'écrire la moindre ligne.

## 2. Rouge : les tests d'abord (§1)

1. Dans `tests/defects/registry.ts`, ajoute à la fin de `DEFECTS` la ligne `'FEAT-<nn>': { title: '…', fixed: false }`, précédée d'un commentaire `// Live coding du <date>`.
2. Écris le test boîte noire dans un **nouveau** fichier `tests/defects/<slug>.spec.ts`, en prenant `tests/defects/metier-d20.spec.ts` comme modèle.
   - Tags : `{ tag: ['@defect', '@FEAT-<nn>'] }`. Jamais `@parity`.
   - Appelle `expectDefect('FEAT-<nn>')` après la mise en place.
   - Couvre les cas qui s'appliquent : nominal, `401` anonyme, `403` mauvais rôle, `404` autre entreprise ou id invalide, `400` entrée invalide, `409`.
   - Corps attendus : `401` et `403` renvoient `{"error":"Unauthorized"}`, `404` renvoie `{"error":"Not found"}`.
3. Écris le test unitaire du cas d'usage dans un **nouveau** fichier `tests/unit/modules/<module>-<slug>.test.ts`, avec des ports en mémoire.
4. Contrat (§8) :
   - nouvelle route : ajoute-la dans `docs/api/openapi.yaml` (chemin, codes `401`/`403`/`500` compris, schéma strict), puis dans `EXPECTED_OPERATIONS` de `tests/api/contract.spec.ts`, et mets à jour le nombre d'endpoints du titre ;
   - champ ajouté : complète le schéma dans `openapi.yaml` ;
   - dans les deux cas : version mineure dans `info.version` (2.0.0 → 2.1.0) et une entrée dans l'« Historique », en fin de `info.description`.
5. Montre le rouge au jury :
   - `npx vitest run tests/unit/modules/<module>-<slug>.test.ts` doit échouer ;
   - `npx playwright test tests/defects/<slug>.spec.ts --no-deps` doit afficher `✘`, compté dans `passed` : c'est l'échec attendu.

## 3. Vert : l'implémentation (§2 à §7)

1. Code dans cet ordre : domaine, puis port borné à l'acteur, puis cas d'usage `make<CasDUsage>(deps)`, puis adapter, puis `index.ts`, puis route `route({ role })`, puis interface.
2. Si la fonctionnalité demande une migration : un nouveau fichier dans `migrations/` (§5, « Changer le schéma »), puis `npm run migrate:up`.
3. Après chaque couche, lance `npm run lint && npm run typecheck`. Une erreur `no-restricted-imports` signale une violation d'architecture : corrige l'import, ne contourne jamais la règle.

## 4. Vérification (§9)

```bash
npm run lint && npm run typecheck && npm run test:unit
npm run build
lsof -ti:3000,3001 | xargs kill 2>/dev/null || true   # sinon Playwright réutilise l'ancien serveur
npx playwright test tests/defects/<slug>.spec.ts tests/api/contract.spec.ts --no-deps
```

1. Le test affiche `Expected to fail, but passed` : passe `fixed: true` sur `FEAT-<nn>`, puis relance jusqu'au vert.
2. Lance la suite complète `npx playwright test` (environ 25 s en local). Lis le résultat avant de déclarer la tâche terminée.
3. Un `✘` compté dans `failed` sur un `@parity` est une régression : corrige le code, jamais le test.
4. Si la fonctionnalité touche au SQL, à une liste ou à l'OCR, ne lance pas `make test-perf` (environ 15 minutes, hors budget). Dis-le dans le récapitulatif : index ajouté, nombre de requêtes par appel, mesure à faire ensuite.

## 5. Récapitulatif pour le jury (10 lignes au plus)

Donne :
- le module et pourquoi ;
- les fichiers, couche par couche ;
- les décisions : route ou champ, synchrone ou asynchrone, migration, existant conservé ;
- les tests ajoutés (rouge puis vert) ;
- les commandes lancées et leur résultat ;
- ce qui reste à faire (perf, relecture de la team Tests, décision à acter).

Termine par le message de commit proposé.

## Pièges qui coûtent du temps

| Symptôme | Cause | Parade |
|---|---|---|
| Le test ne voit pas le changement | serveur périmé sur 3000 ou 3001 (build ancien, `npm run dev` resté ouvert) | `npm run build`, arrêter les serveurs, relancer |
| `Réponse hors contrat` | code ou champ absent d'`openapi.yaml` (schémas stricts) | décrire la nouvelle opération ou le nouveau champ ; un code ou un message existant ne change jamais |
| Un test `@parity` de l'API tombe après l'ajout d'un champ à une note | les tests comparent les réponses entre elles (`Object.keys` dans `tests/api/manager.spec.ts`, `toEqual({ ...created, status })` dans `tests/api/integrity.spec.ts`) | champ présent de la même façon dans **toutes** les réponses qui renvoient une note (toujours présent, `null` permis), ou nouvelle route dédiée |
| `typecheck` rouge dans un test unitaire existant | méthode ajoutée à un port qu'un test implémente (`InMemoryApprovals implements ApprovalRepository`, idem pour `OrganizationRepository` et `UserRepository`) | nouveau port (nouveau fichier) injecté dans le nouveau cas d'usage ; le port existant ne change pas |
| E2E : `strict mode violation`, sélecteur qui trouve 2 éléments | `getByRole(…, { name })` cherche une **sous-chaîne** : un bouton « Rejeter avec motif » attrape aussi `name: 'Rejeter'` | nouveau texte qui ne contient aucun texte existant (`grep` dans `tests/e2e`) |
| SEC-09 rouge en local (`Expected: 0`, `Received: <n>`) | `.env` créé avant l'ajout d'`APP_DB_ROLE` | ajouter `APP_DB_ROLE=expense_app` à `.env` (voir `.env.example`) |
| `baseline-proof` rouge en CI | nouveau test tagué `@parity` | `@defect` + `expectDefect` |
| `permission denied for table …` | nouvelle table sans `GRANT … TO expense_app` | §5, « Changer le schéma » |
| `seed`, `seed:e2e` ou `seed-perf` cassés | colonne `NOT NULL` sans `DEFAULT` | colonne nullable ou avec `DEFAULT` |
| Tests instables en parallèle | organigramme d'un acteur partagé modifié | créer ses propres notes ; organigramme : entreprise neuve (`signupUI` + `uniqueDomain`) ou remise en état dans `finally` |
| Un E2E ne trouve plus un élément | texte renommé, ou second `combobox` dans une ligne de tableau | ajouter des textes, préférer un bouton |

Interdits (`AGENTS.md`) :
- modifier un test existant (seules exceptions : `EXPECTED_OPERATIONS` et l'ajout au registre) ;
- modifier une migration existante ;
- renommer un texte, une route, un script ou une variable ;
- contrôler un rôle dans le handler ;
- écrire dans l'organigramme hors de `OrganizationTransaction`.
