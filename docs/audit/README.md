# Audit Expense.io

Dossier de l'audit d'Expense.io (ce dépôt, rangé dans `docs/audit/`). Objectif
global : auditer l'app, proposer des améliorations **sans changement visible
côté utilisateur**, puis les implémenter, étape par étape.

Deux étapes sont faites. **Étape 1 — cartographie (`01`-`07`)** : comprendre
l'existant, constats seuls. **Étape 2 — audit (`10`-`14` + `poc/`)** : coter
les constats, les vérifier par exécution, et **proposer** des correctifs (sans
les implémenter — c'est la suite, en équipe).

- Relevé les 9 au 13 octobre 2026.
- Périmètre : tout le code source (`src/`, `migrations/`, `scripts/`, config,
  Makefile, docker-compose). `.next/` et `node_modules/` exclus.
- Méthode : lecture statique (étape 1), puis vérification par exécution des
  constats majeurs contre l'instance de dev locale (étape 2). Voir `11`.
- Version web de la cartographie :
  https://claude.ai/artifact/B1R5mT1Jwt2Ga1UCHyQADy

## Sommaire

**Audit (étape 2)** — commencer par la synthèse :

| Fichier | Contenu |
|---|---|
| [10-synthese.md](10-synthese.md) | Verdict, top risques (sécurité et métier), tableau de bord par thème |
| [11-methode.md](11-methode.md) | Méthode, échelles de cotation, granularité, modèle de fiche, pipeline |
| [12-constats.md](12-constats.md) | Les 63 fiches cotées, l'hygiène, la couverture OWASP |
| [13-plan-remediation.md](13-plan-remediation.md) | Correctifs ordonnés en lots, avec dépendances |
| [14-hors-perimetre.md](14-hors-perimetre.md) | Évolutions non traitées |
| [20-audit-architecture-arla.md](20-audit-architecture-arla.md) | Audit d'architecture (cours ARLA) : écarts à combler, architecture cible, plan de refacto, live coding |
| [21-decisions-architecture.md](21-decisions-architecture.md) | Décisions d'équipe : pour et contre de chaque option |
| [22-comportements-a-corriger.md](22-comportements-a-corriger.md) | Comportements étranges et métier à rendre fonctionnel |
| [poc/](poc/) | Démonstrations rejouables des constats vérifiés |

**Cartographie (étape 1)** :

| Fichier | Contenu |
|---|---|
| [01-produit.md](01-produit.md) | Vue métier : rôles, droits, note de frais, cycle de vie, circuit d'approbation, écrans, angles morts |
| [02-architecture.md](02-architecture.md) | Stack, schéma d'architecture, arborescence annotée, code mort |
| [03-donnees-et-objets.md](03-donnees-et-objets.md) | Schéma SQL, policies RLS, objets manipulés (DTO, session), couche domaine inutilisée |
| [04-api.md](04-api.md) | Catalogue des routes API, Server Actions et pages, avec le contrôle d'accès effectif |
| [05-flux.md](05-flux.md) | Diagrammes de séquence : connexion, inscription, création de note, OCR, validation |
| [06-autorisation.md](06-autorisation.md) | Les 4 couches d'autorisation et ce qui protège réellement les données |
| [07-points-de-vigilance.md](07-points-de-vigilance.md) | Constats initiaux (`V-xx`, `M-xx`) ; cotés et complétés dans `12` |

## Conventions

- **Identifiants stables** : `V-xx` = point de vigilance technique, `M-xx` =
  angle mort métier. Les citer tels quels dans les tickets, commits et
  prompts (« corriger V-07 »). Ne jamais renuméroter ; un constat clos est
  marqué comme tel, pas supprimé.
- **Étiquettes** : `lecture` = brouille la compréhension du code ;
  `risque` = sécurité ou intégrité des données.
- **Références code** : chemins relatifs à la racine du dépôt `expense-io/`,
  au format `chemin:ligne`, relevées sur l'état du 2026-10-09. Elles peuvent
  dériver si le code bouge : revérifier avant d'agir.
- **Diagrammes** : en Mermaid (rendu natif sur GitHub/GitLab et dans la
  plupart des éditeurs).

## À savoir avant de lire le code

1. `src/domain`, `src/ports`, `src/adapters`, `src/utils` ne sont **importés
   nulle part**. La logique réelle est dans `src/app/api/**/route.ts`, en SQL
   écrit à la main et largement copié-collé. → V-01, V-02
2. La RLS PostgreSQL est présentée comme garante de l'isolation, mais l'app se
   connecte très probablement avec un rôle superuser qui l'ignore. Seules les
   clauses `WHERE` de chaque route protègent réellement les données. → V-05
3. Plusieurs commentaires justifient avec assurance des choix contestables :
   lire le code plutôt que le commentaire. → V-00

## Note pour les agents

- Avant de modifier une route ou une règle d'accès, lire
  [06-autorisation.md](06-autorisation.md) et les constats `V-xx` concernés.
- Ne pas se fier aux commentaires du code qui parlent de sécurité (V-00).
- Ne pas supposer que `src/domain/` est la source de vérité des règles
  métier : elle n'est jamais appelée (V-01).
- Contrainte du projet : toute amélioration doit rester **invisible pour
  l'utilisateur** (mêmes écrans, mêmes parcours, mêmes réponses attendues).
