# Expense.io

Application de gestion de notes de frais.

## Prérequis

- Node.js 24+
- Docker (Postgres + LocalStack en local)

## Démarrage

```bash
make dev
```

Ceci installe les dépendances, démarre Postgres et LocalStack, applique les
migrations, crée le bucket de stockage, peuple des comptes de démonstration
(voir "Comptes" plus bas), puis lance le serveur de développement sur
http://localhost:3000.

Sans `make`, l'équivalent manuel :

```bash
npm install
cp .env.example .env
docker compose up -d
npm run migrate:up
npm run ensure-bucket
npm run seed
npm run dev
```

## Comptes

`make dev` (ou `npm run seed`) crée trois comptes de la même entreprise,
avec chacun une note de frais en attente pour les deux derniers —
relançable sans dupliquer quoi que ce soit :

| Rôle | Email | Mot de passe |
|---|---|---|
| RH | `hr@expense.io` | `hr1234` |
| Manager (racine, sans manager assigné) | `manager@expense.io` | `manager1234` |
| Employé (rattaché au manager ci-dessus) | `demo@expense.io` | `demo1234` |

Tu peux aussi créer d'autres comptes via `/signup` : le premier compte créé
sur un domaine email donné fonde une nouvelle entreprise et en devient RH ;
les comptes suivants sur le même domaine la rejoignent comme employés. Les
domaines de messagerie publics (gmail.com…) sont refusés. Depuis la page RH,
la RH nomme ensuite les managers (et d'autres RH) et rattache chacun à son
manager : le circuit de validation se monte entièrement depuis l'interface.

## Variables d'environnement

Voir `.env.example`.

## Architecture

Monolithe modulaire Next.js : chaque module métier (`identity`,
`organization`, `expenses`, `approval`, `receipt-scan`, `shared`) vit dans
`src/modules/<module>/` avec ses couches `domain`, `application`, `ports`,
`infrastructure`. Les règles de dépendance sont vérifiées par `npm run lint`.

| Document | Contenu |
|---|---|
| [`docs/architecture/HLD.md`](docs/architecture/HLD.md) | vue d'ensemble, modules, flux principaux |
| [`docs/architecture/DAT.md`](docs/architecture/DAT.md) | pile, déploiement, configuration, sécurité, exploitation |
| [`docs/architecture/adr/`](docs/architecture/adr/README.md) | décisions d'architecture (ADR-001 à ADR-020) |
| [`docs/architecture/ajouter-une-fonctionnalite.md`](docs/architecture/ajouter-une-fonctionnalite.md) | recette pour ajouter une fonctionnalité |
| [`docs/api/openapi.yaml`](docs/api/openapi.yaml) | contrat de l'API (vérifié par les tests) |
| [`docs/audit/`](docs/audit/README.md) | audit : constats, plan, décisions d'équipe |
| [`AGENTS.md`](AGENTS.md) | règles à suivre pour modifier le dépôt (humains et agents IA) |

## Tests

```bash
make test              # tout depuis zéro : Docker, migrations, seed, build, unitaires, parité, défauts
npm run test:unit      # tests unitaires (quelques secondes, sans Docker)
make test-report       # rapport HTML du dernier passage
make test-perf         # performance : baseline contre version courante (environ 15 min)
```

Détail : [`tests/README.md`](tests/README.md) et
[`docs/tests/criteres-fin-de-migration.md`](docs/tests/criteres-fin-de-migration.md).

## Autres commandes

```bash
make build   # build de production
make start   # build puis démarre en production
make lint
make typecheck
make down    # arrête Postgres/LocalStack
make clean   # arrête et supprime les données locales
```
