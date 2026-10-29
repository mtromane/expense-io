#!/usr/bin/env bash
# V-34 / V-10.2 — LocalStack (port 4567) sert-il un objet du bucket des reçus
# sans URL signée (GET direct non authentifié) ? Et les clés sont-elles
# séquentielles donc prévisibles ?
# Mis à jour le 2026-10-29 : V-10.2 (clés séquentielles) et V-34 (accès non signé)
# sont jugés séparément ; depuis SEC-06, la clé est un UUID opaque.
set -u
cd "$(dirname "$0")"; . ./_lib.sh
require_app
ensure_bucket

# On crée une note via l'API réelle pour disposer d'un objet frais dans le
# bucket, et on lit sa clé (séquentielle) renvoyée par l'API (V-10.2).
DOMAIN="poc-v-34.test"
EMP_ID="$(ensure_test_user "emp@$DOMAIN" "poc34pass" "employee" "$DOMAIN")"
C="authjs.session-token=$(applogin "emp@$DOMAIN" poc34pass)"
png_fixture "$WORK/px.png"
NOTE="$(curl -s -b "$C" -X POST "$BASE_URL/api/expense-notes" \
  -F "amount=7.77" -F "expenseDate=2026-05-05" -F "description=poc34" \
  -F "receipt=@$WORK/px.png;type=image/png")"
KEY="$(echo "$NOTE" | jq -r .receiptKey)"
[ -n "$KEY" ] && [ "$KEY" != "null" ] || fail2 "création de note / clé de reçu indisponible : $NOTE"
note "clé renvoyée par l'API (V-10.2, exposée au client) = $KEY"

echo "== V-10.2 : les clés sont séquentielles (receipt_seq serial global) =="
pq "SELECT receipt_seq, receipt_key FROM expense_notes ORDER BY receipt_seq;" | sed 's/^/   /'

echo "== V-34 : GET direct non signé de l'objet via LocalStack (path-style) =="
# URL path-style, SANS aucune signature AWS : http://endpoint/<bucket>/<key>
RAW_URL="$S3_ENDPOINT/$S3_BUCKET/$KEY"
note "URL brute: $RAW_URL"
FETCH="$(curl -s -o "$WORK/obj.bin" -w '%{http_code}/%{size_download}/%{content_type}' "$RAW_URL")"
note "GET non signé => $FETCH"
HEAD="$(xxd "$WORK/obj.bin" 2>/dev/null | head -1)"
note "octets: $HEAD"

echo "== V-10.2 : prévisibilité de la clé =="
if echo "$KEY" | grep -qE '^receipts/[0-9]+\.'; then
  SEQUENTIAL=1; note "clé = $KEY : entier séquentiel, devinable (V-10.2 confirmé)"
else
  SEQUENTIAL=0; note "clé = $KEY : identifiant opaque, non devinable (V-10.2 réfuté, SEC-06)"
fi

echo
if echo "$FETCH" | grep -q '^200/' && echo "$HEAD" | grep -qi 'PNG'; then
  echo "=> LocalStack sert l'objet sans signature ni authentification (V-34, infrastructure"
  echo "   locale : en production, bucket privé et URL présignées seulement)."
  if [ "$SEQUENTIAL" = "1" ]; then
    echo "   Clés séquentielles exposées au client : reçus énumérables (V-10.2)."
  else
    echo "   Clés opaques : un reçu ne se devine plus (V-10.2 réfuté)."
  fi
  verdict CONFIRMÉ
else
  echo "=> L'objet n'a pas été servi sans signature (fetch=$FETCH)."
  verdict PARTIEL
fi
