# 07 — Points de vigilance

Constats seulement, **aucun correctif proposé à ce stade**.

- `lecture` : brouille la compréhension du code.
- `risque` : touche à la sécurité ou à l'intégrité des données.
- Statut : `ouvert` tant que rien n'est décidé. Ne pas renuméroter.
- Les angles morts métier (`M-01` à `M-07`) sont dans
  [01-produit.md](01-produit.md#angles-morts-métier).

## Index

| ID | Type | Titre | Statut |
|---|---|---|---|
| V-00 | lecture | Les commentaires du code ne sont pas fiables | ouvert |
| V-01 | lecture | Architecture hexagonale de façade (code mort) | ouvert |
| V-02 | lecture | Copier-coller massif | ouvert |
| V-03 | lecture | Stratégies d'autorisation incohérentes entre routes | ouvert |
| V-04 | risque | Rattachement inter-entreprises et cycles possibles | ouvert |
| V-05 | risque | RLS contournée (rôle superuser) | ouvert |
| V-06 | risque | Reçus accessibles par n'importe quel manager | ouvert |
| V-07 | risque | Injection SQL par le paramètre de tri | ouvert |
| V-08 | risque | Secret d'authentification codé en dur | ouvert |
| V-09 | risque | Décision : vérification puis écriture, sans verrou | ouvert |
| V-10 | risque | Création de note non atomique, clé de reçu devinable | ouvert |
| V-11 | risque | Stack traces renvoyées au client | ouvert |
| V-12 | risque | Inscription non transactionnelle, emails sensibles à la casse | ouvert |
| V-13 | lecture | OCR coûteux et sans garde-fou | ouvert |
| V-14 | lecture | Détails d'affichage côté client | ouvert |
| V-15 | lecture | Codes HTTP et messages incohérents | ouvert |
| V-16 | lecture | Aucun test automatisé | ouvert |

---

## V-00 — Les commentaires du code ne sont pas fiables · `lecture`

Plusieurs commentaires justifient avec assurance un choix contestable :

| Emplacement | Ce que dit le commentaire | Réalité |
|---|---|---|
| `src/app/api/expense-notes/route.ts:39-41` | ORDER BY ne peut pas être paramétré, donc on concatène | Vrai pour le paramètre, mais une liste blanche s'impose ; ici injection SQL (V-07) |
| `src/app/api/manager/expense-notes/[id]/receipt-url/route.ts:14-16` | La note est forcément dans la liste du manager, pas besoin de revérifier | Rien n'empêche d'appeler l'API avec n'importe quel id (V-06) |
| `src/app/api/hr/users/[id]/manager/route.ts:35-38` | L'appartenance à l'entreprise est garantie par l'annuaire | L'annuaire est côté client ; l'API ne vérifie pas (V-04) |
| `src/lib/auth.ts:6-7` | Secret généré une fois, pas besoin de le régénérer | Secret public dans le code (V-08) |
| `src/lib/db.ts:22-27`, migration l.36-38 | L'isolation est garantie par la RLS | RLS contournée (V-05) |

**Conséquence pour la lecture** : lire le code plutôt que le commentaire,
surtout sur la sécurité.

## V-01 — Architecture hexagonale de façade · `lecture`

**Où** : `src/domain/*`, `src/ports/*`, `src/adapters/*`, `src/utils/*`.

Entités (`ExpenseNote`, `User`), ports, adaptateurs, formatteurs et
validateurs sont écrits mais **jamais importés** (vérifié par grep). La
logique réelle est dans les route handlers. Un nouvel arrivant peut croire
que `ExpenseNote.approve()` fait foi, alors que la règle est réécrite dans 4
routes ; et que `NotificationPort` notifie, alors qu'aucune notification
n'existe.

## V-02 — Copier-coller massif · `lecture`

- Mapping ligne → DTO : 3 fonctions `toExpenseNote` + 4 versions inline
  (routes approve/reject).
- Les 4 routes `approve`/`reject` (manager et RH) ne diffèrent que du statut
  écrit et de la clause `WHERE`.
- Les 3 routes `receipt-url` (voir V-03).
- Côté client : `currencyFormatter`, `dateFormatter`, `inputClass`, styles
  d'erreur, interface `ExpenseNote` redéfinis dans chaque fichier, alors que
  `src/utils/format.ts` existe.
- Regex email dupliquée (`actions/auth.ts:13` vs `utils/validators.ts:1`) ;
  type `UserRole` déclaré 3 fois.

## V-03 — Stratégies d'autorisation incohérentes · `lecture`

« Obtenir l'URL d'un reçu » existe en 3 versions avec 3 stratégies ; l'usage
de `withUserScope` ou du pool brut ne suit aucune règle. Détail dans
[06-autorisation.md](06-autorisation.md).

## V-04 — Rattachement inter-entreprises et cycles · `risque`

**Où** : `src/app/api/hr/users/[id]/manager/route.ts:31-46`.

Le manager choisi n'est vérifié que sur son rôle, pas sur son entreprise. Un
appel direct à l'API peut rattacher un employé à un manager d'une autre
entreprise, qui verra et validera alors ses notes (`/api/manager/*` ne filtre
pas par entreprise). Seul l'auto-rattachement est refusé : A manage B et B
manage A est accepté. Le schéma n'a aucune contrainte équivalente.

## V-05 — RLS contournée · `risque`

**Où** : `docker-compose.yml`, `.env.example`, migration,
`src/app/api/expense-notes/route.ts:103-106`.

L'app se connecte avec un rôle superuser qui ignore la RLS. Démonstration et
requête de vérification dans [06-autorisation.md](06-autorisation.md).
**Non vérifié à l'exécution.** La policy RH ne filtre pas non plus par
entreprise.

## V-06 — Reçus accessibles par n'importe quel manager · `risque`

**Où** : `src/app/api/manager/expense-notes/[id]/receipt-url/route.ts:17`.

`SELECT receipt_key FROM expense_notes WHERE id = $1` sur le pool brut. Il
suffit d'être manager et de connaître l'id (UUID) d'une note pour obtenir son
reçu, quelle que soit l'entreprise.

## V-07 — Injection SQL par le tri · `risque`

**Où** : `src/app/api/expense-notes/route.ts:42-46`.

`?sort=` est concaténé tel quel dans `ORDER BY`. L'interface n'envoie jamais
ce paramètre : surface d'attaque sans usage fonctionnel.

## V-08 — Secret d'authentification codé en dur · `risque`

**Où** : `src/lib/auth.ts:8`.

`AUTH_SECRET` est une constante dans le code ; la variable `AUTH_SECRET` du
`.env` est ignorée. Quiconque a accès au code peut signer un JWT valide avec
n'importe quel `id` et n'importe quel `role`.

## V-09 — Décision : vérification puis écriture, sans verrou · `risque`

**Où** : `src/app/api/{manager,hr}/expense-notes/[id]/{approve,reject}/route.ts`
(~l.14-31).

Le statut est lu, testé en JS (`row.status !== 'pending'`), puis
`UPDATE ... WHERE id = $1` sans `AND status = 'pending'` ni `FOR UPDATE`.
Deux décisions simultanées (deux onglets, ou approuver + rejeter) passent
toutes les deux ; la dernière gagne.

## V-10 — Création non atomique, clé de reçu devinable · `risque`

**Où** : `src/app/api/expense-notes/route.ts:88-106`, `src/lib/storage.ts:25-27`.

- INSERT validé (COMMIT), puis upload S3, puis UPDATE hors transaction. Une
  panne au milieu laisse une note en attente avec `receipt_key = ''` ; un
  échec de l'UPDATE laisse un fichier S3 orphelin.
- Clé `receipts/<receipt_seq>` : séquentielle, donc devinable (atténué par
  le fait que l'accès passe par URL pré-signée).
- Le type MIME annoncé par le client n'est pas vérifié sur le contenu.
- `expenseDate` n'est pas validée (une valeur invalide → 500 Postgres). Montant
  > 99 999 999,99 → dépassement `numeric(10,2)` → 500.
- Le repli `path.extname(receipt.name)` (l.98) ne peut jamais servir.

## V-11 — Stack traces renvoyées au client · `risque`

**Où** : `src/lib/errors.ts:1-6`.

Toute exception renvoie une 500 avec `message` et `stack` : chemins internes,
messages d'erreur SQL, etc.

## V-12 — Inscription non transactionnelle, emails sensibles à la casse · `risque`

**Où** : `src/app/actions/auth.ts:36-69`.

- Création de l'entreprise puis de l'utilisateur en requêtes séparées : si
  l'INSERT utilisateur échoue (ex. course sur le même email), l'entreprise
  reste sans RH, et tous les inscrits suivants du domaine deviennent employés
  d'une entreprise sans administrateur.
- La vérification « email déjà pris » puis l'INSERT ne sont pas atomiques (la
  contrainte UNIQUE rattrape, mais en 500).
- `email` est stocké tel que saisi, contrainte UNIQUE sensible à la casse :
  `Alice@acme.fr` et `alice@acme.fr` sont deux comptes ; la connexion est
  sensible à la casse.

## V-13 — OCR coûteux et sans garde-fou · `lecture`

**Où** : `src/lib/ocr.ts:106-134`.

- Un worker Tesseract est créé puis détruit à chaque requête (rechargement
  du modèle à chaque fois).
- Aucune limite de taille de fichier (le commentaire l.106-108 le reconnaît).
- PDF accepté par le formulaire mais ignoré par l'OCR.
- Heuristiques fragiles : la première ligne avec « total » peut être un
  sous-total ; la première date trouvée peut ne pas être celle de la dépense.

## V-14 — Détails d'affichage côté client · `lecture`

- `window.open` est appelé après un `await` (`expenses/page.tsx:152`,
  `PendingApprovalsPanel.tsx:50`, `AdminConsole.tsx:99`) : les bloqueurs de
  pop-up peuvent l'intercepter.
- `new Date("YYYY-MM-DD")` est interprété en UTC (`expenses/page.tsx:285` et
  équivalents) : hors fuseaux ≥ UTC, la date affichée recule d'un jour.
- Les `fetch` ne sont pas entourés de try/catch : une erreur réseau laisse
  « Chargement… » ou le bouton désactivé sans message.

## V-15 — Codes HTTP et messages incohérents · `lecture`

- Mauvais rôle : 401 côté manager, 403 côté RH, même message « Unauthorized ».
- Messages d'erreur mi-anglais (« Already decided », « Not found ») mi-français
  (« Champs invalides »). Les messages anglais remontent tels quels à
  l'utilisateur dans les composants.

## V-16 — Aucun test automatisé · `lecture`

Ni test unitaire, ni test d'intégration, ni test end-to-end ; pas de CI dans
le dépôt. Toute évolution « sans changement côté utilisateur » devra donc
d'abord établir un filet de non-régression.
