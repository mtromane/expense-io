#!/usr/bin/env bash
# V-09 — Deux décisions concurrentes (approve + reject) sur la même note en
# attente aboutissent-elles toutes les deux, faute de condition de statut dans
# l'UPDATE ? (TOCTOU : SELECT sans FOR UPDATE, test JS, puis UPDATE WHERE id seul)
set -u
cd "$(dirname "$0")"; . ./_lib.sh
require_app

# Un manager de test + un subordonné + une note en attente, via l'API réelle.
DOMAIN="poc-v-09.test"
MGR_ID="$(ensure_test_user "mgr@$DOMAIN" "poc09mgr" "manager" "$DOMAIN")"
EMP_ID="$(ensure_test_user "emp@$DOMAIN" "poc09emp" "employee" "$DOMAIN" "$MGR_ID")"
note "manager=$MGR_ID subordonné=$EMP_ID"

png_fixture "$WORK/px.png"
EC="authjs.session-token=$(applogin "emp@$DOMAIN" poc09emp)"
NID="$(curl -s -b "$EC" -X POST "$BASE_URL/api/expense-notes" \
  -F "amount=42.50" -F "expenseDate=2026-04-04" -F "description=poc09 note" \
  -F "receipt=@$WORK/px.png;type=image/png" | jq -r .id)"
[ -n "$NID" ] && [ "$NID" != "null" ] || fail2 "création de la note a échoué"
MC="authjs.session-token=$(applogin "mgr@$DOMAIN" poc09mgr)"

ROUNDS="${ROUNDS:-10}"
PAR="${PAR:-4}"
double=0
echo "== $ROUNDS rounds : $PAR approve + $PAR reject simultanés sur une note pending =="
for r in $(seq 1 "$ROUNDS"); do
  pq "UPDATE expense_notes SET status='pending' WHERE id='$NID';" >/dev/null
  codes="$WORK/codes"; : > "$codes"
  for i in $(seq 1 "$PAR"); do
    curl -s -o /dev/null -b "$MC" -X POST "$BASE_URL/api/manager/expense-notes/$NID/approve" -w 'A%{http_code}\n' >>"$codes" &
    curl -s -o /dev/null -b "$MC" -X POST "$BASE_URL/api/manager/expense-notes/$NID/reject"  -w 'R%{http_code}\n' >>"$codes" &
  done
  wait
  a200="$(grep -c 'A200' "$codes" || true)"
  r200="$(grep -c 'R200' "$codes" || true)"
  n200=$((a200 + r200))
  final="$(pq "SELECT status FROM expense_notes WHERE id='$NID';")"
  note "round $r : succès approve=$a200 reject=$r200 (total 200=$n200) -> statut final=$final"
  [ "$n200" -gt 1 ] && double=$((double+1))
done
pq "UPDATE expense_notes SET status='pending' WHERE id='$NID';" >/dev/null

echo
echo "Rounds où >1 décision a réussi sur la même note : $double / $ROUNDS"
if [ "$double" -gt 0 ]; then
  echo "=> Plusieurs décisions (dont approve ET reject contradictoires) aboutissent"
  echo "   en 200 sur une seule note ; statut final = dernière écriture. Attendu après"
  echo "   correctif : exactement un 200, les autres 409."
  verdict CONFIRMÉ
else
  echo "=> Aucune double réussite observée (augmenter ROUNDS/PAR, ou latence élevée)."
  verdict PARTIEL
fi
