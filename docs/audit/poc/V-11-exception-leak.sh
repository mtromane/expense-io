#!/usr/bin/env bash
# V-11 — Une requête déclenchant une exception renvoie-t-elle au client un corps
# contenant le message d'exception et/ou la pile d'appels ?
# respondError (src/lib/errors.ts) renvoie { error: message, stack } en 500,
# sur les routes qui AWAIT leurs appels DB.
set -u
cd "$(dirname "$0")"; . ./_lib.sh
require_app

DOMAIN="poc-v-11.test"
EMP_ID="$(ensure_test_user "emp@$DOMAIN" "poc11pass" "employee" "$DOMAIN")"
C="authjs.session-token=$(applogin "emp@$DOMAIN" poc11pass)"
MC="authjs.session-token=$(applogin "$MANAGER_EMAIL" "$MANAGER_PASS")"
png_fixture "$WORK/px.png"

leaks=0; total=0

check() { # <label> <http_code_file_body...>  utilise variables BODY/CODE
  total=$((total+1))
  local has_stack has_sql
  has_stack="$(echo "$BODY" | jq -e 'has("stack") and .stack != null' >/dev/null 2>&1 && echo yes || echo no)"
  has_sql="$(echo "$BODY" | grep -qiE 'invalid input syntax|syntax error|at .*/expense-io/' && echo yes || echo no)"
  note "$1 => HTTP $CODE ; stack=$has_stack ; texte technique=$has_sql"
  note "   corps: $(echo "$BODY" | head -c 180)"
  [ "$has_stack" = "yes" ] || [ "$has_sql" = "yes" ] && leaks=$((leaks+1))
}

echo "== 1. GET /api/manager/expense-notes/<non-uuid>/receipt-url =="
RESP="$(curl -s -b "$MC" "$BASE_URL/api/manager/expense-notes/not-a-uuid/receipt-url" -w $'\n%{http_code}')"
CODE="$(echo "$RESP" | tail -1)"; BODY="$(echo "$RESP" | sed '$d')"
check "manager receipt-url (uuid invalide)"

echo "== 2. POST /api/expense-notes avec expenseDate=abc =="
RESP="$(curl -s -b "$C" -X POST "$BASE_URL/api/expense-notes" \
  -F "amount=10" -F "expenseDate=abc" -F "description=x" \
  -F "receipt=@$WORK/px.png;type=image/png" -w $'\n%{http_code}')"
CODE="$(echo "$RESP" | tail -1)"; BODY="$(echo "$RESP" | sed '$d')"
check "POST note (date invalide)"

echo
echo "Réponses fuyant message technique et/ou stack : $leaks / $total"
if [ "$leaks" -ge 1 ]; then
  echo "=> Le client reçoit le message d'exception Postgres et/ou la pile"
  echo "   d'appels (chemins serveur). Attendu après correctif : message générique."
  verdict CONFIRMÉ
else
  echo "=> Aucune fuite observée."
  verdict RÉFUTÉ
fi
