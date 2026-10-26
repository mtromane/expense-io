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

## 1. Écrire le test du cas d'usage (rouge)

Fichier `tests/unit/modules/<module>.test.ts`, avec les ports simulés en mémoire, sans base ni Next.js. Exemple : `tests/unit/modules/organization.test.ts` simule `OrganizationRepository` (`InMemoryOrganization`), puis vérifie le cas nominal, le refus d'un manager d'une autre entreprise et le refus d'un corps invalide sans écriture.

`tests/` appartient à la team Tests : un **nouveau** fichier se relit dans la PR, un fichier existant ne se modifie pas.

## 2. Domaine (`modules/<module>/domain/`)

Ce sont les règles pures : types, validations, messages du contrat. Elles n'ont aucun import d'infrastructure. Exemple : `organization/domain/CompanyUser.ts` (`INVALID_MANAGER`, `isSelfAssignment`).

## 3. Port (`modules/<module>/ports/`)

C'est l'interface dont le cas d'usage a besoin, un port par fichier. Toute méthode qui lit des données prend l'acteur (ou son identifiant) : **le port est borné à l'acteur**. Exemple : `OrganizationRepository.isManagerOfCompany(hrId, managerId)`.

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
- **Autres tables** : utiliser `getPool()`, avec un filtre explicite sur l'entreprise de l'acteur.
- **Requêtes** : toujours paramétrées, sans aller-retour SQL inutile (règle 7, performance).

Exemple : `PgOrganizationRepository.ts`.

## 6. Assemblage et API publique (`modules/<module>/index.ts`)

Il instancie l'adapter et l'injecte dans le cas d'usage :

```ts
const organization = new PgOrganizationRepository()
export const assignManager = makeAssignManager({ organization })
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

Pour l'interface, on passe par `src/utils/api.ts` (client typé, qui traduit en français les messages de l'API qu'il affiche), en **ajoutant** les textes sans jamais renommer les existants. Dans une ligne de tableau, on n'ajoute pas un second menu déroulant : les tests ciblent `row.getByRole('combobox')`. On préfère un bouton.

## 8. Contrat

Une nouvelle route ou un nouveau champ s'ajoute à `docs/api/openapi.yaml` **par la team Tests**, dans la même PR et avec ses tests de parité. On préfère une nouvelle route à un champ ajouté dans une réponse existante, car les schémas sont stricts. Un code ou un message existant ne change jamais.

## 9. Vérifier

```bash
npm run lint && npm run typecheck && npm run test:unit
npm run build && npx playwright test      # ou make test depuis zéro
make test-perf                            # si la fonctionnalité touche SQL, OCR ou listes
```

`npm run lint` échoue si une règle d'architecture est violée : domaine qui importe l'infrastructure, import des fichiers internes d'un autre module, SQL dans une route.

## Trame de prompt

```text
Contexte : lis AGENTS.md et docs/architecture/ajouter-une-fonctionnalite.md.
Objectif : <fonctionnalité>.
Contraintes :
* identifie le module concerné et justifie ce choix avant de coder ;
* commence par le test unitaire du cas d'usage avec des ports en mémoire ;
* aucun import d'infrastructure dans modules/*/domain ni modules/*/application ;
* données uniquement par un port borné à l'acteur courant ;
* garde de rôle via route(), jamais dans le handler ;
* asynchrone uniquement si le traitement est lent ou dépend d'un service externe.
Vérification : npm run lint && npm run typecheck && npm run test:unit && make test.
```
