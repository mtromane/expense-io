-- Up Migration
-- MET-05 (D20, ADR-020) : un email désigne un seul compte, quelle que soit sa
-- casse. L'index unique sur lower(email) garantit l'unicité en base, y compris
-- pour deux inscriptions simultanées, et sert la recherche de la connexion
-- (`WHERE lower(email) = lower($1)`). L'email reste stocké tel que saisi ; la
-- contrainte d'origine sur email est conservée (seed-e2e s'en sert).
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));
