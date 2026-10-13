#!/usr/bin/env bash
# V-05.1 — Le rôle Postgres de l'application est-il soumis à la RLS ?
# Constat attendu : le rôle de connexion (DATABASE_URL) est superuser et/ou
# BYPASSRLS, donc les policies RLS de expense_notes sont décoratives.
set -u
cd "$(dirname "$0")"; . ./_lib.sh
require_app

echo "== Rôle de connexion de l'application (.env DATABASE_URL) =="
pq "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;"
ROLSUPER="$(pq "SELECT rolsuper FROM pg_roles WHERE rolname = current_user;")"
ROLBYPASS="$(pq "SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user;")"
note "rolsuper=$ROLSUPER rolbypassrls=$ROLBYPASS"

echo "== RLS activée sur expense_notes ? (attendu: t/t) =="
pq "SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname='expense_notes';"

echo "== SELECT sur expense_notes sous un app.current_user_id SANS aucune note =="
# On pose un id bidon (aucun utilisateur, donc aucune policy ne s'applique).
# Sous RLS effective -> 0 ligne. Si le rôle ignore la RLS -> toutes les notes
# de toutes les entreprises restent visibles.
TOTAL="$(pq "SELECT count(*) FROM expense_notes;")"
SANS_SCOPE="$(pq "SELECT set_config('app.current_user_id','00000000-0000-0000-0000-000000000000',false); SELECT count(*) FROM expense_notes;" | tail -1)"
note "notes totales en base = $TOTAL ; visibles sous un id non propriétaire = $SANS_SCOPE"

OK=1
[ "$ROLSUPER" = "t" ] || [ "$ROLBYPASS" = "t" ] || OK=0
# Le rôle voit toutes les notes alors qu'aucun app.current_user_id n'est posé.
[ -n "$SANS_SCOPE" ] && [ "$SANS_SCOPE" = "$TOTAL" ] && [ "$TOTAL" -gt 0 ] || OK=0

echo
if [ "$OK" = "1" ]; then
  echo "=> Rôle superuser/bypassrls : la RLS de expense_notes est contournée."
  echo "   Un WHERE applicatif oublié (V-06) ou injecté (V-07) lit toute la base."
  verdict CONFIRMÉ
else
  echo "=> Le rôle ne contourne pas la RLS, ou la base est vide."
  verdict RÉFUTÉ
fi
