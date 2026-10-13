# 04 — Catalogue API, Server Actions et pages

La colonne « contrôle effectif » indique ce qui protège réellement la donnée,
au-delà du test de rôle. La RLS n'y figure pas car elle est très probablement
contournée (V-05).

## Route Handlers (`src/app/api`)

| Méthode | Route | Rôle | Contrôle effectif | Mauvais rôle | Constats |
|---|---|---|---|---|---|
| GET | `/api/expense-notes` | connecté | `WHERE user_id = moi` ; `?sort` concaténé dans `ORDER BY` | 401 | V-07 |
| POST | `/api/expense-notes` | connecté | INSERT avec mon id, puis upload S3, puis UPDATE via le pool brut | 401 | V-10 |
| POST | `/api/expense-notes/receipt-suggestion` | connecté | aucune donnée lue ; pas de limite de taille | 401 | V-13 |
| GET | `/api/expense-notes/[id]/receipt-url` | connecté | `WHERE id AND user_id = moi` (dans `withUserScope`) | 401 | — |
| GET | `/api/manager/expense-notes` | manager | `JOIN users WHERE manager_id = moi AND status = 'pending'` | 401 | — |
| POST | `/api/manager/expense-notes/[id]/approve` | manager | même jointure, test du statut en JS, puis UPDATE | 401 | V-09 |
| POST | `/api/manager/expense-notes/[id]/reject` | manager | idem | 401 | V-09 |
| GET | `/api/manager/expense-notes/[id]/receipt-url` | manager | **aucun** : `WHERE id = $1` sur le pool brut | 401 | V-06 |
| GET | `/api/hr/expense-notes` | hr_admin | auteur manager racine **et** même entreprise, statut pending | 403 | — |
| POST | `/api/hr/expense-notes/[id]/approve` | hr_admin | idem, test du statut en JS, puis UPDATE | 403 | V-09 |
| POST | `/api/hr/expense-notes/[id]/reject` | hr_admin | idem | 403 | V-09 |
| GET | `/api/hr/expense-notes/[id]/receipt-url` | hr_admin | auteur manager racine et même entreprise | 403 | — |
| GET | `/api/hr/users` | hr_admin | même entreprise, rôles `employee`/`manager` uniquement | 403 | — |
| PUT | `/api/hr/users/[id]/manager` | hr_admin | cible dans mon entreprise ; manager choisi : **seul le rôle** est vérifié | 403 | V-04 |
| GET, POST | `/api/auth/[...nextauth]` | public | Auth.js | — | — |

### Formats

- Corps de création : `multipart/form-data` avec `amount`, `expenseDate`,
  `description`, `receipt` (fichier).
- Corps de rattachement : JSON `{ "managerId": "<uuid>" | null }`.
- Réponse note : `{ id, userId, amount, expenseDate, description, receiptKey, status, createdAt }`.
- Réponse reçu : `{ url }`.
- Réponse OCR : `{ amount?, expenseDate? }`.
- Erreurs : `{ error }` (400/401/403/404/409) ; erreurs inattendues :
  `{ error, stack }` en 500 (V-11).

Codes métier : `404 Not found` si la note n'est pas visible par l'appelant,
`409 Already decided` si la note n'est plus en attente, `409 Invalid manager`
pour un rattachement invalide.

## Server Actions (`src/app/actions/auth.ts`)

| Action | Appelée par | Effet |
|---|---|---|
| `signup(prev, formData)` | `/signup` | Valide nom, email (regex), mot de passe ≥ 8 ; crée l'entreprise si le domaine est nouveau (rôle `hr_admin`) sinon rôle `employee` ; INSERT user ; `signIn` → `/expenses`. Non transactionnel (V-12). |
| `login(prev, formData)` | `/login` | `signIn('credentials')` → `/expenses`, ou « Email ou mot de passe incorrect. » |
| `logout()` | bouton du header (`layout.tsx`) | `signOut` → `/login` |

## Pages

| URL | Type | Protection |
|---|---|---|
| `/` | Server Component | aucune ; redirige vers `/expenses` si connecté |
| `/login`, `/signup` | Client Component | aucune |
| `/expenses` | Client Component | `proxy.ts` (connecté) ; tout rôle |
| `/manager` | Server Component → `PendingApprovalsPanel` (client) | `proxy.ts` + test `role === 'manager'` dans la page |
| `/hr` | Server Component → `AdminConsole` (client) | `proxy.ts` + test `role === 'hr_admin'` dans la page |

`proxy.ts` ne s'applique pas à `/api` (matcher `src/proxy.ts:17`) : chaque
route API fait son propre `auth()`.
