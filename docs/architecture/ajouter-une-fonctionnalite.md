# Ajouter une fonctionnalité

La recette à suivre pour toute nouvelle fonctionnalité, par un humain ou un agent IA. L'exemple utilisé est le rattachement d'un membre à un manager (`PUT /api/hr/users/:id/manager`, module `organization`). Les règles du dépôt sont dans `AGENTS.md` ; la carte des modules dans [HLD.md](HLD.md).

## 0. Choisir le module

Avant de coder, il faut savoir de quoi parle la fonctionnalité :

| Elle porte sur… | Module |
|---|---|
| un compte, l'inscription, la connexion, la session | `identity` |
| l'entreprise, l'organigramme, les rôles, le rattachement | `organization` |
| les notes d'un employé et leurs reçus | `expenses` |
| qui valide quoi, les décisions | `approval` |
| la lecture automatique d'un reçu | `receipt-scan` |

Si elle couvre deux modules, chacun garde ses données. Un module appelle l'autre par son `index.ts` et ne lit jamais les tables de l'autre. Créer un module n'est justifié que pour un nouveau domaine métier. Dans ce cas, il prend la même structure : `domain/`, `application/`, `ports/`, `infrastructure/`, `index.ts`, `README.md`.

Avant de coder, on cherche dans `tests/` la route, le bouton ou le champ que la fonctionnalité touche (`grep -rn "<route|texte>" tests/`) : ces tests `@parity` décrivent l'existant qui ne doit pas bouger. Si la fonctionnalité rend obligatoire ou modifie un comportement qu'ils couvrent (par exemple « un motif est obligatoire pour refuser »), on **ajoute** un chemin (nouvelle route, nouveau bouton) et on garde l'ancien tel quel (`AGENTS.md`, règle 5).

## 1. Écrire les tests (rouge)

Deux tests, écrits avant le code, chacun dans un **nouveau** fichier. On n'écrit jamais dans un fichier de test existant : `tests/` appartient à la team Tests, un nouveau fichier se relit dans la PR, un fichier existant ne se modifie pas.

### 1.1 Test boîte noire (API ou interface)

Le contrat n'est vérifié que sur les réponses que les tests obtiennent réellement : une route que personne n'appelle n'est jamais confrontée à `openapi.yaml`, et ses `401`, `403` et `404` ne sont jamais vérifiés. On suit le même chemin que les fonctionnalités décidées en équipe (ROLE-04 pour `GET /api/hr/admins`) :

1. **Registre** : ajouter `'FEAT-<nn>': { title: '…', fixed: false }` en fin de `DEFECTS` dans `tests/defects/registry.ts`. C'est un ajout, aucune entrée existante ne change.
2. **Test** : nouveau fichier `tests/defects/<fonctionnalité>.spec.ts`, avec les tags `{ tag: ['@defect', '@FEAT-<nn>'] }` et `expectDefect('FEAT-<nn>')` appelé **après** la mise en place (un échec de setup reste un vrai échec). Jamais `@parity` : le job CI `baseline-proof` rejoue `@parity` sur l'application d'origine, qui ne connaît pas la fonctionnalité, et il tomberait.
3. **Cas couverts** (selon la route) : nominal, `401` anonyme (`anonymous()`), `403` mauvais rôle, `404` ressource d'une autre entreprise, `400` entrée invalide, `409` conflit.

Outils de `tests/support/` : `loginAs('<acteur>')` (contexte connecté, chaque réponse validée contre le contrat), `anonymous()`, `actor('<clé>')` (acteurs de `tests/fixtures/dataset.json` : `empA1` rattaché à `subMgrA`, `hrA`, `empB` d'une autre entreprise…), `createNote(ctx)` et `uniqueDescription()` (`notes.ts`), `loginUI(page, credentialsOf(actor('hrA')))` (`ui.ts`) pour un test d'interface. Modèle : `tests/defects/metier-d20.spec.ts`.

Les tests tournent en parallèle. On ne modifie pas l'organigramme d'un acteur partagé : on crée ses propres notes. Si la fonctionnalité modifie l'organigramme, on crée une entreprise neuve (`signupUI` + `uniqueDomain()` : le premier inscrit est RH) ou on remet l'état d'origine dans un `finally`.

Rouge attendu : `npx playwright test tests/defects/<fonctionnalité>.spec.ts --no-deps` affiche `✘`, compté dans `passed` (échec attendu).

### 1.2 Test unitaire du cas d'usage

Dans `tests/unit/modules/<module>-<fonctionnalité>.test.ts` (par exemple `organization-conges.test.ts`), avec les ports simulés en mémoire, sans base ni Next.js. Le fichier existant du module (`tests/unit/modules/<module>.test.ts`) ne se modifie pas.

Modèles à recopier :
- `tests/unit/modules/organization.test.ts` simule `OrganizationRepository` (`InMemoryOrganization`) et sa transaction (`inTransaction`). Il vérifie le cas nominal, le refus d'un manager d'une autre entreprise et le refus d'un corps invalide sans écriture.
- `tests/unit/modules/expenses-date-future.test.ts` est le plus court : une `ExpenseTransaction` simulée par `vi.fn()` et une horloge injectée.

## 2. Domaine (`modules/<module>/domain/`)

Ce sont les règles pures : types, validations, messages du contrat. Elles n'ont aucun import d'infrastructure. Exemple : `organization/domain/CompanyUser.ts` (`INVALID_MANAGER`, `isSelfAssignment`).

Exception héritée : les entités partagées par plusieurs modules, `ExpenseNote` et `User`, vivent dans `src/domain/` (domaine ranimé, ADR-004). Les ports partagés `ReceiptStoragePort` et `NotificationPort` sont dans `src/ports/`, leurs adapters dans `src/adapters/`. On les étend sur place, on ne les déplace pas pendant une fonctionnalité.

## 3. Port (`modules/<module>/ports/`)

C'est l'interface dont le cas d'usage a besoin, un port par fichier. Toute méthode qui lit des données prend l'acteur (ou son identifiant) : **le port est borné à l'acteur**. Exemple : `OrganizationRepository.isManagerOfCompany(hrId, managerId)`.

On n'ajoute pas de méthode à un port existant qu'un test unitaire existant implémente (`InMemoryApprovals implements ApprovalRepository`, idem pour `OrganizationRepository` et `UserRepository`) : ce test ne compilerait plus (`npm run typecheck`), et on n'a pas le droit de le modifier. On crée plutôt un **nouveau** port, dans un nouveau fichier, injecté dans le nouveau cas d'usage. L'adapter existant peut implémenter les deux.

## 4. Cas d'usage (`modules/<module>/application/`)

C'est une fabrique `make<CasDUsage>(deps)` qui reçoit ses ports et renvoie une fonction. Elle lève les erreurs typées de `@/modules/shared/domain` :

| Erreur | Réponse HTTP (par `route()`) |
|---|---|
| `NotFoundError` | `404 {"error":"Not found"}` : absent **ou hors périmètre** (même réponse) |
| `InvalidInputError(message)` | `400 {"error": message}` (message en anglais, défaut `Invalid fields` : D15) |
| `ConflictError(message)` | `409 {"error": message}` |
| autre | `500` générique, détail journalisé |

Exemple : `organization/application/assignManager.ts`.

## 5. Adapter (`modules/<module>/infrastructure/`)

C'est l'implémentation du port :

- **Notes de frais** : passer par `withUserScope(actorId, …)` (`@/modules/shared/infrastructure/db`), pour que la RLS s'applique.
- **Écritures dans l'organigramme** (rôle, rattachement, tout ce qui modifie `users`) : passer par `OrganizationTransaction` (`pgOrganizationTransaction`), la transaction verrouillée par entreprise. Le cas d'usage reçoit `{ transaction }` et travaille dans `transaction.run(actor.id, async (organization) => …)`. Une écriture faite hors de cette transaction échappe au verrou : deux requêtes simultanées pourraient alors aboutir toutes les deux (ADR-014).
- **Autres lectures** : utiliser `getPool()`, avec un filtre explicite sur l'entreprise de l'acteur.
- **Requêtes** : toujours paramétrées, sans aller-retour SQL inutile (règle 7, performance).

Exemple : `PgOrganizationRepository.ts`.

### Changer le schéma (migration)

Une colonne ou une table de plus passe par une **nouvelle** migration. Une migration existante ne se modifie jamais : elle est déjà appliquée en CI, en perf et sur les machines de l'équipe.

- **Fichier** : `migrations/<horodatage en millisecondes>_<sujet>.sql`, avec un horodatage supérieur au dernier fichier du dossier. Il commence par `-- Up Migration` et un commentaire qui cite la décision ou l'identifiant (`FEAT-<nn>`). Si la migration est réversible, il se termine par une section `-- Down Migration`. Exemples : `1761782400000_met05-email-insensible-a-la-casse.sql` (court, sans `Down`) et `1761350400000_isolation-rls-et-index.sql` (avec `Down`).
- **Droits** : le `GRANT` d'une table existante couvre déjà ses nouvelles colonnes (`expense_notes`, `users`, `companies`). Rien à ajouter pour une colonne.
- **Appliquer** : `npm run migrate:up` (ou `make migrate`). La CI et `make test` l'appliquent toutes seules.
- **Colonne ajoutée** : nullable, ou `NOT NULL DEFAULT …`. Sinon, les `INSERT` existants de `scripts/seed.mjs`, `scripts/seed-e2e.mjs` et `scripts/seed-perf.mjs` échouent, et avec eux les comptes de démo (contrat), les tests et la perf. Adapter le mapping ligne → entité (`shared/infrastructure/expenseNoteRecord.ts` pour les notes).
- **Table ajoutée** :
  - `GRANT SELECT, INSERT, UPDATE ON <table> TO expense_app;`. Les transactions `withUserScope` prennent ce rôle sans privilège (ADR-006) : sans `GRANT`, `permission denied for table <table>`. Ajouter `GRANT USAGE` sur la séquence s'il y a un `serial`.
  - Données d'une entreprise ou d'une note : `company_id` copié par un trigger (modèle `expense_notes_set_company`, ADR-007), puis `ENABLE` et `FORCE ROW LEVEL SECURITY`, avec des policies écrites avec `(SELECT app_current_user_id())`. Modèle : `migrations/1761350400000_isolation-rls-et-index.sql`.
- **Liste ou filtre** : ajouter l'index qui sert la requête (règle 7, performance) et le citer dans la PR.
- **`users` et `companies`** : `scripts/seed-e2e.mjs` crée les acteurs des tests. On le prévient et on l'adapte avec la team Tests (`AGENTS.md`, règle 6).

## 6. Assemblage et API publique (`modules/<module>/index.ts`)

Il instancie l'adapter et l'injecte dans le cas d'usage. Extrait réel de `organization/index.ts` : les lectures reçoivent le dépôt, les écritures reçoivent la transaction verrouillée.

```ts
const organization = new PgOrganizationRepository()

export const listDirectory = makeListDirectory({ organization })                      // lecture
export const assignManager = makeAssignManager({ transaction: pgOrganizationTransaction }) // écriture
```

## 7. Route (`src/app/api/**/route.ts`)

C'est un contrôleur fin : la garde, la lecture de la requête, l'appel au cas d'usage, le presenter. Le rôle se contrôle uniquement dans `route()`, jamais dans le handler (`401` sans session, `403` sans le rôle ; rôle relu en base) :

```ts
export const PUT = route<{ id: string }>({ role: 'hr_admin' }, async ({ request, actor, params }) => {
  const input = await request.json().catch(() => undefined)
  const user = await assignManager({ actor, userId: params.id, input })
  return Response.json(user)
})
```

### Interface

| Écran | Page | Composant |
|---|---|---|
| employé : ses notes, soumission, suggestion OCR | `src/app/expenses/page.tsx` (composant client, tout est dans la page) | — |
| manager : notes à valider | `src/app/manager/page.tsx` | `src/components/PendingApprovalsPanel.tsx` |
| RH : annuaire, rôles, équipe RH, notes à valider | `src/app/hr/page.tsx` | `src/components/AdminConsole.tsx` |

- **Pages `manager` et `hr`** : composants serveur. Le rôle est vérifié par `currentActor()` (`src/app/current-user.ts`), et un mauvais rôle appelle `forbidden()` (page « Accès réservé », servie en 403, D19).
- **Composants et page employé** : composants client (`'use client'`). Ils appellent l'API **uniquement** par `src/utils/api.ts` (`employeeApi`, `managerApi`, `hrApi`), jamais par `fetch` directement, ni par un module, ni par la base.
- **Nouvelle route** : une méthode ajoutée dans le bon objet de `src/utils/api.ts`, typée par un DTO de `src/modules/shared/http/presenters.ts`.
- **Message d'erreur affiché** : le message de l'API (en anglais, D15) se traduit dans `SCREEN_MESSAGES` de `src/utils/api.ts`.
- **Textes** : en français, **ajoutés**, jamais renommés. Les E2E, les nôtres et probablement ceux des professeurs, cherchent les éléments par leur texte et leur rôle ARIA. Une nouvelle section prend un titre relié par `aria-labelledby` (modèle : « Équipe RH » dans `AdminConsole.tsx`) : le test la retrouve par `getByRole('region', { name: '…' })`.
- **Dans une ligne de tableau** : pas de second menu déroulant, car les tests ciblent `row.getByRole('combobox')`. On préfère un bouton.
- **Choisir un nouveau texte** : `getByRole(…, { name: 'Rejeter' })` cherche une **sous-chaîne**, sans tenir compte de la casse. Un nouveau bouton « Rejeter avec motif » serait donc aussi trouvé par les tests existants, qui échoueraient en `strict mode violation`. Avant de choisir un texte, on cherche dans `tests/e2e` qu'il ne contient aucun texte existant.

## 8. Contrat

On préfère une nouvelle route à un champ ajouté dans une réponse existante, car les schémas sont stricts. Un code ou un message existant ne change jamais.

- **Champ ajouté à une note** : le schéma `ExpenseNote` est partagé par toutes les opérations qui renvoient une note, et les tests de parité comparent ces réponses entre elles (`Object.keys` dans `tests/api/manager.spec.ts`, `toEqual({ ...created, status })` dans `tests/api/integrity.spec.ts`). Le champ doit donc apparaître de la même façon dans **toutes** ces réponses : toujours présent, `null` permis. Précédent : `authorName`, ajouté seulement au schéma de la file manager (`PendingExpenseNote`, D20).
- **Version** : un ajout fait passer la version mineure de `info.version` (2.0.0 → 2.1.0). On l'inscrit dans l'« Historique », en fin de `info.description`.
- **Corps des refus de `route()`** : `401` et `403` renvoient `{"error":"Unauthorized"}`, `404` renvoie `{"error":"Not found"}`.

**Ajouter une route = deux fichiers à mettre à jour dans la même PR**, sinon la suite échoue :

1. `docs/api/openapi.yaml` : le chemin, le verbe, le corps attendu, chaque code de réponse possible (y compris `401`, `403` de `route()` et `500`) et le schéma de la réponse. Toute réponse d'un test qui sort de ce contrat fait échouer le test (« Réponse hors contrat »).
2. `tests/api/contract.spec.ts` : ajouter `'<VERBE> <chemin>'` (même écriture que dans `openapi.yaml`, par exemple `'GET /api/hr/admins'`) à la liste `EXPECTED_OPERATIONS`, et mettre à jour le nombre d'endpoints dans le titre du test (« les N endpoints sont décrits »). Ce test vérifie que le contrat liste exactement les routes attendues : il échoue tant que cette liste n'est pas à jour.

C'est la seule modification d'un test existant qu'implique une nouvelle route : c'est une évolution de contrat voulue, pas un test modifié pour masquer une régression (`AGENTS.md`, règles 2 et 5). Elle se fait dans la même PR que la route, et la team Tests la relit (CODEOWNERS). Un champ ajouté à une réponse existante suit la même règle pour `openapi.yaml`. Exemple complet : la PR #7 (`GET /api/hr/admins`).

## 9. Vérifier

```bash
npm run lint && npm run typecheck && npm run test:unit
npm run build && npx playwright test      # ou make test depuis zéro
make test-perf                            # si la fonctionnalité touche SQL, OCR ou listes
```

`npm run lint` échoue si une règle d'architecture est violée : domaine qui importe l'infrastructure, import des fichiers internes d'un autre module, SQL dans une route.

### Boucle courte (live coding)

Durées mesurées en local, avec le cache de Turbopack :
- lint, typecheck et unitaires : quelques secondes ;
- `npm run build` après une modification : 2 à 3 s ;
- une spec Playwright ciblée : environ 3 s ;
- la suite complète (329 tests) : environ 25 s.

Le cycle rouge puis vert ne coûte donc que quelques secondes d'exécution. On boucle sur le plus court et on lance la suite complète à la fin :

```bash
npm run lint && npm run typecheck && npx vitest run tests/unit/modules/<module>-<fonctionnalité>.test.ts
npm run build
lsof -ti:3000,3001 | xargs kill 2>/dev/null || true
npx playwright test tests/defects/<fonctionnalité>.spec.ts tests/api/contract.spec.ts --no-deps
npx playwright test                       # une fois, à la fin
```

- **Serveur périmé** : en local, Playwright **réutilise** un serveur déjà lancé sur 3000 et 3001 (`reuseExistingServer`). Après chaque `npm run build`, il faut arrêter ces serveurs (y compris un `npm run dev` resté ouvert), sinon les tests attaquent l'ancien code.
- **Du rouge au vert** : quand le code est prêt, le test de la fonctionnalité affiche `Expected to fail, but passed`. On passe alors `fixed: true` sur `FEAT-<nn>` (`AGENTS.md`, règle 4), et le test redevient un test normal.
- **Performance** : `make test-perf` dure environ 15 minutes. En live coding, on ne le lance pas : on annonce qu'il reste à lancer, avec l'index ajouté et le nombre de requêtes par appel.

## Trame de prompt

Avec Claude Code, la commande `/feature <énoncé>` (`.claude/skills/feature/SKILL.md`) déroule cette recette : cadrage validé par un humain, rouge, vert, vérification, récapitulatif. Pour un autre agent, ou pour expliquer le prompt :

```text
Contexte : lis AGENTS.md et docs/architecture/ajouter-une-fonctionnalite.md.
Objectif : <fonctionnalité>.
Contraintes :
* identifie le module concerné et justifie ce choix avant de coder ;
* commence par les tests : boîte noire tests/defects/<fonctionnalité>.spec.ts (@defect, FEAT-<nn> à fixed: false dans tests/defects/registry.ts), puis test unitaire du cas d'usage avec des ports en mémoire ;
* changement de schéma : nouvelle migration, colonne nullable ou DEFAULT, GRANT à expense_app pour une nouvelle table ;
* aucun import d'infrastructure dans modules/*/domain ni modules/*/application ;
* données uniquement par un port borné à l'acteur courant ;
* garde de rôle via route(), jamais dans le handler ;
* asynchrone uniquement si le traitement est lent ou dépend d'un service externe, alors en suivant la recette outbox de la section « Si la fonctionnalité demande de l'asynchrone » d'AGENTS.md ;
* test unitaire dans un nouveau fichier tests/unit/modules/<module>-<fonctionnalité>.test.ts ;
* écriture dans l'organigramme : par la transaction verrouillée (OrganizationTransaction) ;
* nouvelle route : docs/api/openapi.yaml et EXPECTED_OPERATIONS de tests/api/contract.spec.ts dans la même PR ;
* une fois le test boîte noire passé (Expected to fail, but passed) : FEAT-<nn> à fixed: true.
Vérification : npm run lint && npm run typecheck && npm run test:unit && make test.
```
