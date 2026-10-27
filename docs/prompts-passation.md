# Passation de la refonte à un autre poste

## 1. À coller dans ta session Claude Code actuelle (sur ton Mac)

```text
On arrête ici sur ce Mac : un camarade avec une machine plus puissante va reprendre la refonte depuis GitHub. Nettoie la branche et prépare la passation. Ne lance aucune suite de tests ni de mesure de perf.

1. Inventaire. Affiche git status, git stash list et git log --oneline origin/main..HEAD. S'il reste un stash de la comparaison d'hier, vérifie que son contenu est déjà dans le working tree ou dans les commits, puis supprime-le ; sinon, dis-le-moi avant de continuer.

2. Rien de parasite dans les commits. Vérifie sur toute la branche (git diff --stat origin/main..HEAD, et git status) qu'aucun de ces fichiers n'est suivi ni prêt à être commité : .env, etat-des-lieux.md, perf-results/, test-results/, playwright-report/, fichiers du scratchpad, *.patch, .DS_Store, logs. S'il y en a un dans un commit, retire-le de l'historique de la branche (la branche n'a jamais été poussée, on peut réécrire). Vérifie que etat-des-lieux.md est bien dans .git/info/exclude.

3. Étape 7. Commite le code de l'étape 7 tel qu'il est, dans un commit séparé dont le message commence par « wip(front): étape 7 non vérifiée (ni build, ni lint, ni tests) ». Rien d'autre dans ce commit.

4. Historique lisible. Un commit par étape, dans l'ordre 0 à 7, avec un message clair en français au format refactor(<module>): ..., et la liste des défauts basculés dans le corps du message. Garde la correction des policies RLS (3c39507) comme commit séparé : c'est une décision de perf qu'on veut pouvoir montrer. Si des commits de correction intermédiaires existent (fixup, typo, essais), fusionne-les dans le commit de leur étape avec un rebase. Ne change pas le contenu des commits vérifiés : seulement leur regroupement et leurs messages. Après réécriture, vérifie que git diff entre l'ancien HEAD et le nouveau est vide.

5. Contrôle rapide sans tests : npm run lint et npm run typecheck sur le dernier commit vérifié (avant le wip) doivent passer. Ne les corrige pas sur le wip.

6. Note de passation dans ../passation-refonte.md (hors du dépôt) :
   - pour chaque étape 0 à 8 : commit, défauts basculés, ce qui est prouvé (avec la dernière suite verte) et ce qui ne l'est pas ;
   - PERF-01 et PERF-02 : dernières mesures et pourquoi elles ne comptent pas ;
   - le point CI : la team Tests doit ajouter APP_DB_ROLE: expense_app aux jobs parity et defects de ci.yml, pas à baseline-proof ;
   - la cause probable des emballements de Docker (k6 lancé en conteneur) et le conseil d'installer k6 en natif ;
   - les écarts avec la refonte décrite par le camarade : ce qui a été fait pareil, ce qui ne l'a pas été (corrections métier D12 à D19, routes PUT /api/hr/users/:id/role et GET /api/manager/reports, module identity si non créé) et pourquoi ;
   - la liste exacte de ce qu'il reste à faire.

7. Affiche le nouveau git log --oneline origin/main..HEAD et git status, puis demande-moi confirmation avant de pousser.

8. Après mon accord seulement : git push -u origin refactor/architecture-modulaire. N'ouvre pas de PR.
```

## 2. À donner au camarade qui reprend

Avant de lancer Claude Code : Node 24, Docker démarré, `brew install k6` (ou le binaire k6 de son OS), puis :

```bash
git clone https://github.com/mtromane/expense-io.git && cd expense-io
git checkout refactor/architecture-modulaire
make clean
```

Puis il colle ceci dans Claude Code, avec le contenu de passation-refonte.md à la suite :

```text
Tu reprends la refonte d'architecture d'Expense.io sur la branche refactor/architecture-modulaire (projet ARLA, soutenance le 30 octobre). Les étapes 0 à 6 sont commitées et vérifiées ; le dernier commit « wip(étape 7) » n'est ni buildé ni testé. La note de passation est collée à la fin de ce message. Réponds en français.

Règles : lis d'abord AGENTS.md, docs/tests/criteres-fin-de-migration.md et docs/audit/21-decisions-architecture.md. Ne modifie jamais tests/, playwright.config.ts, scripts/seed-e2e.mjs, .github/ ni docs/api/openapi.yaml pour faire passer un test ; seules exceptions, les bascules fixed: true dans tests/defects/registry.ts et tests/perf/targets.json quand c'est réellement corrigé. Pas de correction métier (D12 à D19 non tranchées) : la garde garde les codes HTTP actuels. Commite à chaque étape verte, ne pousse rien sans mon accord.

Avant chaque suite : make clean, puis vérifie que k6 est bien le binaire natif (pas l'image grafana/k6) et que la charge est normale (uptime).

Ordre :
1. Vérifie l'étape 7 : lint, typecheck, build, unitaires, Playwright complet. Corrige le code si besoin, bascule BUG-01 à fixed: true s'il passe, et réécris le commit wip en un commit propre « refactor(front): ... ».
2. make test-perf. Si PERF-01 et PERF-02 sont atteints sur une mesure stable, passe-les à fixed: true dans un commit dédié ; sinon, note les chiffres.
3. Étape 8 : règles ESLint d'architecture en erreur, suppression de src/lib s'il est vide, un README par module, docs/architecture/ (HLD et DAT courts), et dans AGENTS.md une section « Ajouter une fonctionnalité » (use case → port → adapter → route → contrat → test), sans toucher aux règles 1 à 7.
4. Suite complète finale, puis récap dans ../recap-refonte-expense-io.md (hors dépôt) : résumé, tableau avant/après (tests, défauts sur 17, critères de fin de migration, p95 perf), une ligne par étape avec son commit, ADR proposées, ce qui reste ouvert.
5. Affiche git log --oneline origin/main..HEAD et demande avant de pousser.
```
