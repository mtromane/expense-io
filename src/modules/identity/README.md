# Module `identity`

Inscription, connexion et acteur de la session courante.

| Couche | Fichier | Rôle |
|---|---|---|
| domain | `SignupForm.ts` | validation du formulaire d'inscription, entreprise déduite du domaine de l'email, rôle du nouvel inscrit (premier du domaine : `hr_admin`, sinon `employee`) |
| application | `signup.ts` | crée l'entreprise si besoin, puis le compte avec son mot de passe haché |
| application | `authenticate.ts` | vérifie des identifiants ; renvoie `null` aussi bien pour un email inconnu que pour un mot de passe faux |
| ports | `UserRepository.ts`, `PasswordHasher.ts` | comptes et entreprises ; hachage |
| infrastructure | `PgUserRepository.ts` | Postgres, hors transaction (aucun acteur avant la connexion ; `users` et `companies` ne sont pas soumises à la RLS) |
| infrastructure | `BcryptPasswordHasher.ts` | bcrypt, coût 12 |
| infrastructure | `authjs.ts` | Auth.js : session JWT, provider « credentials » qui délègue à `authenticate` |

API publique (`index.ts`) : `signup`, `authenticate`, `getActor`, et les fonctions Auth.js `auth`, `handlers`, `signIn`, `signOut`.

- `getActor()` sert à la garde `route()` (`shared/http`) : c'est l'acteur `{ id, role }` de la session, ou `null`.
- La server action `src/app/actions/auth.ts` appelle `signup` puis `signIn` (connexion automatique) ; elle ne contient plus de SQL.
- `src/proxy.ts` (pages protégées) utilise `auth` de ce module.

Messages du contrat (formulaire) : `INVALID_SIGNUP`, `EMAIL_TAKEN`.

Tests : `tests/unit/modules/identity.test.ts` (comptes en mémoire, hachage factice).
