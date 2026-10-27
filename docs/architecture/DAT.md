# DAT : dossier d'architecture technique d'Expense.io

Document de synthèse : pile technique, déploiement, configuration, sécurité, exploitation, tests et performance. La vue fonctionnelle et les modules sont dans [HLD.md](HLD.md).

## 1. Pile technique

| Élément | Choix |
|---|---|
| Application | Next.js 16 (App Router, build de production `next start`), React 19, TypeScript |
| Authentification | Auth.js v5 (NextAuth), session JWT, identifiants email et mot de passe (bcrypt coût 12) |
| Base de données | PostgreSQL 16, migrations SQL (`node-pg-migrate`, dossier `migrations/`) |
| Stockage des reçus | S3 (LocalStack 3.8.1 en local), URL présignées de 5 minutes |
| OCR | tesseract.js, données `tessdata/` locales, pool de workers en processus |
| Tests | Vitest (unitaires), Playwright (parité, défauts, E2E), k6 (performance) |

## 2. Déploiement

Un seul processus Node.js (monolithe modulaire), plus deux services d'infrastructure :

| Service | Port | Lancement local |
|---|---|---|
| Application | 3000 | `make dev` (développement), `npm run build && npm run start` (production) |
| PostgreSQL | 5433 | `docker-compose.yml` (`make up`) |
| LocalStack S3 | 4567 | `docker-compose.yml` (`make up`) |

Préparer une base vierge : `make up migrate ensure-bucket seed`. Les ports, scripts npm et cibles make font partie du contrat et ne changent pas.

## 3. Configuration (Twelve-Factor)

Toute la configuration vient de l'environnement (`.env.example`) et passe par `src/config.ts`. Au démarrage, `src/instrumentation.ts` arrête le serveur si `AUTH_SECRET` ou `DATABASE_URL` manque, plutôt que de laisser un serveur qui échouerait à chaque requête.

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | connexion PostgreSQL (pool de 20 connexions) |
| `AUTH_SECRET` | signature des sessions (SEC-04 : jamais dans le code) |
| `AUTH_TRUST_HOST` | requis par Auth.js en production |
| `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_FORCE_PATH_STYLE` | stockage des reçus |
| `APP_DB_ROLE` | rôle PostgreSQL sans privilège pris dans chaque transaction scopée (défaut `expense_app`, créé par les migrations) |

## 4. Sécurité

| Sujet | Mesure |
|---|---|
| Authentification | Auth.js, mots de passe bcrypt (coût 12), même réponse pour un email inconnu et un mot de passe faux ; inscription refusée sur les domaines de messagerie publics (D16) |
| Autorisation | garde unique `route()` : `401` sans session, `403` sans le rôle (D12), identifiant d'URL validé. Le rôle est relu en base à chaque requête : un changement de rôle s'applique sans reconnexion. Les pages `/manager` et `/hr` affichent « Accès réservé » en `403` si le rôle ne convient pas (D19) |
| Isolation entre entreprises | repositories bornés à l'acteur, plus une RLS PostgreSQL effective (`SET LOCAL ROLE` vers `APP_DB_ROLE`), avec `company_id` recopié par trigger |
| Ressource hors périmètre | `404`, identique à une ressource inexistante (son existence n'est pas révélée) |
| Reçus | clé opaque (UUID), type vérifié sur la signature du fichier, 10 Mo au plus, URL présignée de 5 minutes |
| Erreurs | `{ "error": "..." }` en anglais (D15), sans stack ni chemin interne. Le détail est journalisé côté serveur (SEC-05). L'écran affiche les messages en français |
| Injection SQL | requêtes paramétrées, tri par liste blanche (SEC-01) |

## 5. Exploitation

- **Journaux** : une ligne JSON par événement (`modules/shared/infrastructure/logger.ts`), avec niveau, événement et champs.
- **Corrélation** : chaque réponse d'API porte un en-tête `x-request-id`, repris de la requête s'il est valide, sinon généré. Il figure dans le journal d'erreur.
- **Événements notables** : `ocr.failed` (suggestion OCR en échec, la requête répond quand même), `receipt.orphaned` (reçu non supprimé après une création de note en échec).
- **Démarrage** : configuration validée, sinon arrêt immédiat avec un message clair.

## 6. Données

Deux migrations :

- `1700000000001_init-schema.sql` : schéma d'origine (`companies`, `users`, `expense_notes`, policies RLS initiales) ;
- `1761350400000_isolation-rls-et-index.sql` : `company_id` sur les notes par trigger, index des listes, policies réécrites et indexables, rôle `expense_app`.

Les tables `users` et `companies` n'ont pas changé : `scripts/seed.mjs` et `scripts/seed-e2e.mjs` restent valides.

## 7. Tests

| Suite | Commande | Ce qu'elle garantit |
|---|---|---|
| Unitaires | `npm run test:unit` | domaine et cas d'usage de chaque module, avec des ports en mémoire |
| Parité | `npx playwright test --grep @parity` | aucun comportement perdu ; chaque réponse est validée contre `docs/api/openapi.yaml` |
| Défauts | `make test-defects` | les 17 défauts techniques corrigés (`tests/defects/registry.ts`) |
| Qualité | `npm run lint && npm run typecheck` | règles d'architecture bloquantes, typage |
| Tout | `make test` | depuis zéro (Docker, migrations, seed, build) |

## 8. Performance

`make test-perf` compare la version courante à la baseline `265924b`, sur la même machine et dans le même run. Il alterne les passages et compare les médianes de p95 (`docs/perf/README.md`). Le jeu de données compte 20 entreprises, 2 002 utilisateurs et 193 300 notes.

| Objectif | Moyen |
|---|---|
| PERF-01 : OCR p95 ≤ 50 % de la baseline | pool de workers Tesseract réutilisés au lieu d'un worker créé par requête |
| PERF-02 : listes p95 ≤ 50 % de la baseline | index des listes et policies RLS indexables (`user_id = ANY (ARRAY(...))`) |

Résultats et bascules : `tests/perf/targets.json` et `perf-results/latest.md`.
