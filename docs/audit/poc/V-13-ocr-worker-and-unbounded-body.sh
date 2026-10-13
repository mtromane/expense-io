#!/usr/bin/env bash
# V-13.1 — /api/expense-notes/receipt-suggestion crée un worker OCR par requête
#           (createWorker + terminate), sans borne ni file d'attente.
# V-13.2 — La route OCR lit un corps multipart entier sans aucune limite ;
#           la route de création de note teste la limite 10 Mo APRÈS avoir
#           bufferisé tout le corps (request.formData()) -> 400, pas 413.
# Intensité volontairement faible : quelques requêtes, pas de saturation.
set -u
cd "$(dirname "$0")"; . ./_lib.sh
require_app

DOMAIN="poc-v-13.test"
EMP_ID="$(ensure_test_user "emp@$DOMAIN" "poc13pass" "employee" "$DOMAIN")"
C="authjs.session-token=$(applogin "emp@$DOMAIN" poc13pass)"
png_fixture "$WORK/px.png"

# RSS du processus next-server (celui qui écoute sur :3000)
SRV_PID="$(ss -ltnp 2>/dev/null | grep ':3000' | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2)"
rss() { [ -n "${SRV_PID:-}" ] && awk '/VmRSS/{print int($2/1024)}' "/proc/$SRV_PID/status" 2>/dev/null || echo "?"; }
note "processus serveur pid=${SRV_PID:-inconnu} ; RSS initiale=$(rss) MB"

echo "== V-13.1 : coût unitaire — 3 requêtes OCR séquentielles (worker/requête) =="
for i in 1 2 3; do
  t="$(curl -s -o /dev/null -b "$C" -X POST "$BASE_URL/api/expense-notes/receipt-suggestion" \
       -F "receipt=@$WORK/px.png;type=image/png" -w '%{time_total}')"
  note "req $i : temps=${t}s ; RSS=$(rss) MB"
done

echo "== V-13.1 : 4 requêtes OCR concurrentes (les workers coexistent) =="
R0="$(rss)"
for i in 1 2 3 4; do
  curl -s -o /dev/null -b "$C" -X POST "$BASE_URL/api/expense-notes/receipt-suggestion" \
    -F "receipt=@$WORK/px.png;type=image/png" &
done
PEAK="$R0"
for s in 1 2 3 4 5; do sleep 0.3; cur="$(rss)"; [ "$cur" != "?" ] && [ "$cur" -gt "$PEAK" ] 2>/dev/null && PEAK="$cur"; done
wait
note "RSS avant=$R0 MB ; pic pendant 4 workers=$PEAK MB"

echo "== V-13.2 : corps volumineux (40 Mo) sur la route OCR — aucune borne =="
BIG="$WORK/big.bin"; head -c 40000000 /dev/zero | tr '\0' 'A' > "$BIG"
RB="$(rss)"
OCR_CODE="$(curl -s -o "$WORK/o.out" -b "$C" -X POST "$BASE_URL/api/expense-notes/receipt-suggestion" \
  -F "receipt=@$BIG;type=application/octet-stream" -w '%{http_code}')"
note "OCR 40 Mo => HTTP $OCR_CODE ; RSS $RB -> $(rss) MB (corps entièrement bufferisé)"

echo "== V-13.2 : corps volumineux (40 Mo) sur la création de note =="
RB2="$(rss)"
POST_CODE="$(curl -s -o "$WORK/p.out" -b "$C" -X POST "$BASE_URL/api/expense-notes" \
  -F "amount=5" -F "expenseDate=2026-01-01" -F "description=big" \
  -F "receipt=@$BIG;type=image/png" -w '%{http_code}')"
note "POST 40 Mo => HTTP $POST_CODE ($(head -c 60 "$WORK/p.out")) ; RSS $RB2 -> $(rss) MB"
note "   -> 400 'Fichier trop volumineux' MAIS après lecture complète en mémoire"
note "      (la limite 10 Mo est testée après request.formData(), pas en 413)."

echo
# Confirmé si : OCR accepte le gros corps (pas de 413) ET le POST renvoie 400
# (et non 413) prouvant que la limite n'intervient qu'après bufferisation.
if [ "$OCR_CODE" != "413" ] && { [ "$OCR_CODE" = "200" ] || [ "$OCR_CODE" = "500" ]; } \
   && [ "$POST_CODE" = "400" ]; then
  echo "=> OCR : worker par requête, aucune borne de corps (40 Mo acceptés)."
  echo "   Création de note : limite appliquée après bufferisation complète (400, pas 413)."
  verdict CONFIRMÉ
else
  echo "=> Résultat inattendu (OCR=$OCR_CODE POST=$POST_CODE)."
  verdict PARTIEL
fi
