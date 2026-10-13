#!/usr/bin/env bash
# Bibliothèque commune aux PoC de la phase 2.
# Tout est en lecture seule vis-à-vis de expense-io/ : on lance l'app via ses
# scripts npm, on lit ses node_modules, on écrit seulement des données de test
# dans la base de dev (comptes/notes sur des domaines dédiés @poc-*.test).
#
# Verdict (dernière ligne de chaque PoC) et code de sortie :
#   CONFIRMÉ -> 0   RÉFUTÉ -> 1   PARTIEL -> 2
set -u

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
BASE_URL="${BASE_URL:-http://localhost:3000}"

# Connexion Postgres de dev (docker-compose, port publié 5433).
# Valeurs imposées (certains environnements exportent déjà PGHOST/PGPORT vers
# le socket local : on les écrase pour viser le conteneur). Pour pointer
# ailleurs, utiliser POC_PGHOST / POC_PGPORT / POC_PGUSER / POC_PGDATABASE.
PGHOST="${POC_PGHOST:-localhost}"
PGPORT="${POC_PGPORT:-5433}"
PGUSER="${POC_PGUSER:-expense}"
PGDATABASE="${POC_PGDATABASE:-expense_io}"
export PGHOST PGPORT PGUSER PGDATABASE
export PGPASSWORD="${POC_PGPASSWORD:-expense}"

# LocalStack (S3), port publié 4567
S3_ENDPOINT="${S3_ENDPOINT:-http://localhost:4567}"
S3_BUCKET="${S3_BUCKET:-receipts}"

# Secret Auth.js codé en dur dans src/lib/auth.ts:8 (cf. V-08).
AUTH_SECRET_HARDCODED='e29f9c3b6a1d4e7f8021c5b6d4a9f0e3c7b8a2d1f6e5c4b3a2918273645fabcd'

# Comptes de démonstration (scripts/seed.mjs)
DEMO_EMAIL="demo@expense.io";    DEMO_PASS="demo1234"
MANAGER_EMAIL="manager@expense.io"; MANAGER_PASS="manager1234"
HR_EMAIL="hr@expense.io";        HR_PASS="hr1234"

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

note()  { printf '  %s\n' "$*" >&2; }
fail2() { printf 'PARTIEL (prérequis absent) : %s\n' "$*"; echo PARTIEL; exit 2; }

pq() { psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -tAc "$1"; }

require_app() {
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/login" 2>/dev/null || true)"
  [ "$code" = "200" ] || [ "$code" = "307" ] || fail2 "l'app ne répond pas sur $BASE_URL (lancer 'npm run dev' dans $APP_DIR)"
  pq "SELECT 1" >/dev/null 2>&1 || fail2 "Postgres injoignable sur $PGHOST:$PGPORT"
}

ensure_bucket() {
  ( cd "$APP_DIR" && npm run ensure-bucket >/dev/null 2>&1 ) || true
}

# applogin <email> <password>  -> imprime le jeton de session (flux NextAuth réel)
applogin() {
  local email="$1" pass="$2" jar="$WORK/jar.$$.$RANDOM"
  local csrf
  csrf="$(curl -s -c "$jar" "$BASE_URL/api/auth/csrf" | sed 's/.*"csrfToken":"\([^"]*\)".*/\1/')"
  curl -s -o /dev/null -b "$jar" -c "$jar" -X POST "$BASE_URL/api/auth/callback/credentials" \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "csrfToken=$csrf" \
    --data-urlencode "email=$email" \
    --data-urlencode "password=$pass"
  grep -i 'authjs.session-token' "$jar" | awk '{print $NF}'
}

# forge_token <id> <role>  -> jeton JWE forgé hors-ligne avec le secret en dur (V-08)
forge_token() {
  ( cd "$APP_DIR" && node --input-type=module -e "
import { encode } from 'next-auth/jwt'
const j = await encode({ token: { id: '$1', role: '$2' }, secret: '$AUTH_SECRET_HARDCODED', salt: 'authjs.session-token' })
process.stdout.write(j)
" )
}

# bcrypt_hash <password> -> hash bcrypt (via le bcryptjs de l'app)
bcrypt_hash() {
  ( cd "$APP_DIR" && node --input-type=module -e "
import bcrypt from 'bcryptjs'
process.stdout.write(await bcrypt.hash('$1', 12))
" )
}

# Écrit un PNG 1x1 valide dans le chemin donné
png_fixture() {
  printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' | base64 -d > "$1"
}

# ensure_test_user <email> <password> <role> <company_domain> [manager_id]
# Crée (idempotent) une entreprise + un utilisateur de test ; imprime l'id user.
# NB : l'inscription réelle est une server action difficile à piloter en curl ;
# on insère donc le compte directement en base (donnée de test, domaine dédié),
# mais toutes les opérations sensibles testées passent par l'API HTTP réelle.
ensure_test_user() {
  local email="$1" pass="$2" role="$3" domain="$4" mgr="${5:-}"
  local hash cid
  hash="$(bcrypt_hash "$pass")"
  pq "INSERT INTO companies (name, email_domain) VALUES ('${domain%%.*}','$domain') ON CONFLICT (email_domain) DO NOTHING;" >/dev/null
  cid="$(pq "SELECT id FROM companies WHERE email_domain='$domain';")"
  if [ -n "$mgr" ]; then
    pq "INSERT INTO users (email,name,password_hash,role,company_id,manager_id)
        VALUES ('$email','${email%%@*}','$hash','$role','$cid','$mgr')
        ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash,
          role=EXCLUDED.role, company_id=EXCLUDED.company_id, manager_id=EXCLUDED.manager_id;" >/dev/null
  else
    pq "INSERT INTO users (email,name,password_hash,role,company_id)
        VALUES ('$email','${email%%@*}','$hash','$role','$cid')
        ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash,
          role=EXCLUDED.role, company_id=EXCLUDED.company_id, manager_id=NULL;" >/dev/null
  fi
  pq "SELECT id FROM users WHERE email='$email';"
}

verdict() { # <CONFIRMÉ|RÉFUTÉ|PARTIEL>
  case "$1" in
    CONFIRMÉ) echo CONFIRMÉ; exit 0 ;;
    RÉFUTÉ)   echo RÉFUTÉ;   exit 1 ;;
    *)        echo PARTIEL;  exit 2 ;;
  esac
}
