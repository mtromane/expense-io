# 05 — Flux (diagrammes de séquence)

## 1. Connexion

```mermaid
sequenceDiagram
  autonumber
  actor U as Utilisateur
  participant L as /login, client
  participant A as Server Action login
  participant NA as Auth.js
  participant PG as PostgreSQL
  U->>L: email et mot de passe
  L->>A: formAction avec FormData
  A->>NA: signIn credentials
  NA->>PG: SELECT id, email, password_hash, role FROM users WHERE email = $1
  PG-->>NA: ligne utilisateur
  NA->>NA: bcrypt.compare
  NA-->>A: cookie JWT contenant id et role
  A-->>U: redirection vers /expenses
```

Le rôle est figé dans le JWT au login : un changement de rôle en base n'est
pris en compte qu'à la reconnexion suivante.

Code : `src/app/actions/auth.ts:82-102`, `src/lib/auth.ts:22-59`.

## 2. Inscription

```mermaid
sequenceDiagram
  autonumber
  actor V as Visiteur
  participant A as Server Action signup
  participant PG as PostgreSQL
  participant NA as Auth.js
  V->>A: nom, email, mot de passe
  A->>A: regex email, longueur 8 minimum
  A->>PG: SELECT users WHERE email
  A->>PG: INSERT companies ON CONFLICT email_domain DO NOTHING
  alt entreprise créée
    A->>A: rôle hr_admin
  else domaine déjà connu
    A->>PG: SELECT companies WHERE email_domain
    A->>A: rôle employee
  end
  A->>PG: INSERT users, manager_id NULL
  A->>NA: signIn, redirection vers /expenses
  Note over A,PG: 4 à 5 requêtes séparées, sans transaction
```

Code : `src/app/actions/auth.ts:15-80`. Voir V-12, M-02, M-03.

## 3. Création d'une note de frais

```mermaid
sequenceDiagram
  autonumber
  actor E as Employé
  participant P as /expenses, client
  participant R as POST /api/expense-notes
  participant PG as PostgreSQL
  participant S3 as S3
  E->>P: remplit le formulaire et joint le reçu
  P->>R: multipart FormData
  R->>R: auth puis validation montant, description, type MIME, taille
  R->>PG: BEGIN puis set_config app.current_user_id
  R->>PG: INSERT expense_notes avec receipt_key vide, RETURNING receipt_seq
  R->>PG: COMMIT
  R->>S3: PutObject receipts/seq.ext
  R->>PG: UPDATE receipt_key, via le pool brut hors withUserScope
  R-->>P: 201 et note JSON
  P->>R: GET /api/expense-notes pour recharger la liste
  Note over R,S3: Si PutObject échoue, la note reste en base, en attente, avec un receipt_key vide
```

La date n'est pas validée côté serveur : une chaîne invalide est rejetée par
Postgres et renvoie une 500 avec la stack.

Code : `src/app/api/expense-notes/route.ts:56-112`. Voir V-05, V-10, V-11.

## 4. Pré-remplissage par OCR

```mermaid
sequenceDiagram
  autonumber
  actor E as Employé
  participant P as /expenses
  participant R as POST receipt-suggestion
  participant T as Worker Tesseract fra
  E->>P: clic sur Pré-remplir depuis le reçu
  P->>R: FormData avec le fichier
  alt PNG, JPEG ou WebP
    R->>T: createWorker, un nouveau à chaque requête
    R->>T: recognize
    T-->>R: texte brut
    R->>R: parseAmount, plus grand montant de la 1re ligne contenant total, montant, ttc
    R->>R: parseExpenseDate, 1er motif de date reconnu
    R->>T: terminate
  else PDF ou autre type
    R->>R: réponse vide
  end
  R-->>P: amount et expenseDate, chacun optionnel
  P->>P: remplit les champs, message si résultat partiel ou vide
```

Le formulaire accepte les PDF mais l'OCR les ignore : sur un PDF, le
pré-remplissage répond toujours « Aucune information reconnue ».

Détail des heuristiques (`src/lib/ocr.ts`) :

- **Montant** : prend la *première* ligne contenant `total|montant|ttc|à payer|net à`
  (sinon toutes les lignes), y cherche les nombres décimaux et garde le plus
  grand. À défaut, entiers sur les lignes avec mot-clé ou `€`/`EUR`.
- **Date** : premier motif trouvé dans l'ordre `jj/mm/aaaa`, `aaaa-mm-jj`,
  `jj/mm/aa` (→ 20aa), `jj mois aaaa` en français.

Code : `src/app/api/expense-notes/receipt-suggestion/route.ts`,
`src/lib/ocr.ts:109-134`. Voir V-13.

## 5. Validation par le manager

```mermaid
sequenceDiagram
  autonumber
  actor M as Manager
  participant C as PendingApprovalsPanel
  participant R as API /api/manager
  participant PG as PostgreSQL
  participant S3 as S3
  C->>R: GET expense-notes
  R->>PG: SELECT notes pending dont l'auteur a manager_id = moi
  R-->>C: liste JSON
  M->>C: Voir le reçu
  C->>R: GET id/receipt-url
  R->>PG: SELECT receipt_key WHERE id, sans contrôle de rattachement
  R->>S3: pré-signature GetObject, 300 s
  R-->>C: url
  C->>S3: window.open(url) après un await
  M->>C: Approuver
  C->>R: POST id/approve
  R->>PG: SELECT note JOIN users WHERE manager_id = moi
  alt statut différent de pending
    R-->>C: 409 Already decided
  else
    R->>PG: UPDATE status = approved
    R-->>C: 200 et note
  end
  C->>R: GET expense-notes pour recharger
```

Le parcours RH (`AdminConsole`, routes `/api/hr/…`) est identique, avec un
filtre « auteur manager racine de mon entreprise ».

Code : `src/components/PendingApprovalsPanel.tsx`,
`src/app/api/manager/expense-notes/**`. Voir V-06, V-09, V-14.

## 6. Rattachement d'un collaborateur (RH)

```mermaid
sequenceDiagram
  autonumber
  actor H as RH
  participant C as AdminConsole
  participant R as PUT /api/hr/users/id/manager
  participant PG as PostgreSQL
  H->>C: choisit un manager dans le menu
  C->>R: JSON managerId ou null
  R->>PG: SELECT company_id de l'appelant
  R->>PG: SELECT cible WHERE id, company_id, rôle employee ou manager
  alt managerId non null
    R->>R: refuse si managerId = id
    R->>PG: SELECT WHERE id = managerId AND role = manager, sans filtre entreprise
  end
  R->>PG: UPDATE users SET manager_id
  R-->>C: utilisateur mis à jour
  C->>R: GET /api/hr/users pour recharger
```

Code : `src/app/api/hr/users/[id]/manager/route.ts`. Requêtes hors
transaction et hors `withUserScope`. Voir V-04.
