# Module `shared`

Le socle commun aux modules. Il ne contient aucune règle métier.

| Dossier | Contenu |
|---|---|
| `domain/` | `Actor` (acteur authentifié), erreurs typées `NotFoundError`, `ConflictError`, `InvalidInputError`, limites des reçus |
| `http/` | `route()` : garde de session et de rôle, identifiant d'URL validé, erreurs traduites, `x-request-id`. On y trouve aussi les presenters et DTO du contrat (`ExpenseNoteDto`, `CompanyUserDto`…) et la lecture des reçus multipart |
| `infrastructure/` | `db.ts` (pool unique, `withUserScope` : transaction, `app.current_user_id`, `SET LOCAL ROLE`), `s3ReceiptStorage.ts` (client S3), `logger.ts` (journal JSON), `expenseNoteRecord.ts` (ligne SQL → entité) |

Le domaine et les cas d'usage des modules n'importent ni `shared/http` ni `shared/infrastructure` : ces règles sont vérifiées par ESLint.
