#!/usr/bin/env bash
# V-05.1 — Le rôle Postgres de l'application est-il soumis à la RLS ?
# Constat attendu : le rôle de connexion (DATABASE_URL) est superuser et/ou
# BYPASSRLS, donc les policies RLS de expense_notes sont décoratives.
#
# Mis à jour le 2026-10-29 (SEC-09, ADR-006) : l'application ne lit plus les
# notes avec le rôle de connexion. Chaque transaction scopée bascule sur le rôle
# sans privilège APP_DB_ROLE (`SET LOCAL ROLE`, défaut expense_app, cf.
# .env.example). Le verdict porte donc sur le rôle **effectif** de l'application,
# comme le test SEC-09 (tests/defects/p1.spec.ts) ; le rôle de connexion reste
# affiché pour mémoire (il est toujours superuser : migrations et seed-perf).
set -u
cd "$(dirname "$0")"; . ./_lib.sh

require_app

APP_DB_ROLE="${APP_DB_ROLE:-expense_app}"

echo "== Rôle de connexion (.env DATABASE_URL), pour mémoire =="
pq "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;"

echo "== Rôle effectif de l'application : APP_DB_ROLE=$APP_DB_ROLE =="
if [ "$(pq "SELECT count(*) FROM pg_roles WHERE rolname = '$APP_DB_ROLE';")" = "1" ]; then
  EFFECTIVE="$APP_DB_ROLE"
  SET_ROLE="SET LOCAL ROLE \"$APP_DB_ROLE\";"
else
  note "rôle $APP_DB_ROLE absent : l'application lit avec le rôle de connexion"
  EFFECTIVE="$(pq "SELECT current_user;")"
  SET_ROLE=""
fi
pq "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = '$EFFECTIVE';"

echo "== RLS activée sur expense_notes ? (attendu: t/t) =="
pq "SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname='expense_notes';"

echo "== SELECT sur expense_notes sous un app.current_user_id SANS aucune note =="
# Même contexte que l'application : transaction, rôle effectif, identifiant
# d'acteur bidon (aucun utilisateur, donc aucune policy ne donne de ligne).
# Sous RLS effective -> 0 ligne. Si le rôle ignore la RLS -> toutes les notes.
# psql -c n'affiche que le résultat de la dernière commande ; la transaction
# ouverte est annulée à la fermeture de la connexion.
TOTAL="$(pq "SELECT count(*) FROM expense_notes;")"
SANS_SCOPE="$(pq "BEGIN; $SET_ROLE SELECT set_config('app.current_user_id','00000000-0000-0000-0000-000000000000',true); SELECT count(*) FROM expense_notes;" | grep -E '^[0-9]+$' | tail -1)"
note "notes totales en base = $TOTAL ; visibles par $EFFECTIVE sous un id non propriétaire = $SANS_SCOPE"

OK=1
# Le rôle effectif voit toutes les notes alors qu'aucun acteur n'en possède.
[ -n "$SANS_SCOPE" ] && [ "$SANS_SCOPE" = "$TOTAL" ] && [ "$TOTAL" -gt 0 ] || OK=0

echo
if [ "$OK" = "1" ]; then
  echo "=> Le rôle effectif de l'application ignore la RLS de expense_notes."
  echo "   Un WHERE applicatif oublié (V-06) ou injecté (V-07) lit toute la base."
  verdict CONFIRMÉ
else
  echo "=> Le rôle effectif de l'application est soumis à la RLS ($SANS_SCOPE note visible sur $TOTAL),"
  echo "   ou la base est vide."
  verdict RÉFUTÉ
fi
