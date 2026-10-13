# PoC de vérification — phase 2

Scripts rejouables qui vérifient **par exécution** les constats de
`../12-constats.md`, contre l'instance de **développement locale** de
`expense-io`. Ils confirment, infirment ou nuancent la cotation établie en
lecture statique, et serviront de base aux tests de non-régression (phase 3).

> Strictement local. Lecture seule sur `expense-io/` : on lance l'app via ses
> scripts `npm`, on lit ses `node_modules`, on n'écrit que des **données de
> test** dans la base de dev (comptes/notes sur des domaines dédiés
> `@poc-*.test`). Intensité minimale : juste assez de requêtes pour démontrer
> chaque constat, aucun test de charge.

## Prérequis

- Docker en marche : conteneurs `expense-io-postgres-1` (port **5433**) et
  `expense-io-localstack-1` (port **4567**).
- Base peuplée : `npm run seed` dans `expense-io/` (comptes `hr@expense.io`,
  `manager@expense.io`, `demo@expense.io`).
- Application Next lancée :

  ```bash
  # depuis la racine du dépôt
  npm run dev        # sert http://localhost:3000
  ```

- Outils : `bash`, `curl`, `jq`, `psql`, `python3`, `node` (celui de l'app, via
  ses `node_modules` — les scripts n'installent rien).

Chaque script vérifie ses prérequis et sort en **PARTIEL (code 2)** avec un
message clair si l'app ou la base manquent.

## Comment rejouer

```bash
cd docs/audit/poc
./V-08-forged-session-token.sh          # un constat
for s in V-*.sh; do echo "== $s =="; ./$s; echo "verdict exit=$?"; done   # tous
```

Chaque script affiche son déroulé, puis en **dernière ligne** un verdict et un
code de sortie :

| Dernière ligne | Code de sortie |
|---|---|
| `CONFIRMÉ` | 0 |
| `RÉFUTÉ`   | 1 |
| `PARTIEL`  | 2 |

Les scripts sont **idempotents** (ré-exécutables sans échouer ; les comptes de
test sont créés en `ON CONFLICT DO UPDATE`). `make clean && make dev` côté app
remet la base à zéro.

Variables d'override (optionnelles) : `BASE_URL`, `APP_DIR`, `POC_PGHOST`,
`POC_PGPORT`, `POC_PGUSER`, `POC_PGDATABASE`, `POC_PGPASSWORD`. Pour V-09 :
`ROUNDS` et `PAR` (nombre de rounds et de requêtes concurrentes).

`_lib.sh` : bibliothèque commune (login NextAuth réel, forge de jeton,
helpers psql/S3, création de comptes de test).

## Table ID → statut

| Script | Constat(s) | Statut |
|---|---|---|
| `V-05-role-postgres-bypass-rls.sh` | V-05.1 | CONFIRMÉ |
| `V-06-manager-receipt-cross-tenant.sh` | V-06 | CONFIRMÉ |
| `V-07-sort-sql-injection.sh` | V-07 | CONFIRMÉ |
| `V-08-forged-session-token.sh` | V-08 | CONFIRMÉ |
| `V-09-concurrent-decisions.sh` | V-09 | CONFIRMÉ |
| `V-11-exception-leak.sh` | V-11 | CONFIRMÉ |
| `V-13-ocr-worker-and-unbounded-body.sh` | V-13.1, V-13.2 | CONFIRMÉ |
| `V-34-localstack-unsigned-and-sequential-keys.sh` | V-34, V-10.2 | CONFIRMÉ |

## Notes de méthode

- **Authentification.** Pour les constats qui ne portent pas sur l'auth, les
  scripts se connectent via le **flux NextAuth réel** (`/api/auth/csrf` +
  `callback/credentials`) — l'exploit ne dépend donc pas de V-08. Seul
  `V-08-*` forge un jeton hors-ligne, ce qui *est* le constat testé.
- **Création de comptes.** L'inscription est une *server action* difficile à
  piloter en `curl` ; les comptes de test sont donc insérés directement en base
  (donnée de test, domaine dédié), mais **toutes les opérations sensibles
  vérifiées passent par l'API HTTP réelle** (création de note avec reçu,
  décisions, récupération d'URL de reçu).
- **V-07.** L'exfiltration est démontrée **à l'aveugle** (temporel/booléen via
  `pg_sleep`), pas par message d'erreur : `GET /api/expense-notes` fait
  `return withUserScope(...)` **sans `await`**, donc l'exception ne passe pas
  par `respondError` (le corps 500 est vide). Le canal « erreur » de V-11 ne
  s'applique pas à cette route.
