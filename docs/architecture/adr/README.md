# Décisions d'architecture (ADR)

Une ADR par décision D1 à D11 de [`docs/audit/21-decisions-architecture.md`](../../audit/21-decisions-architecture.md).
Le numéro de l'ADR reprend celui de la décision (ADR-002 = D2). Chacune applique la recommandation du document 21.

**Statut de toutes les ADR : acceptées par l'équipe le 2026-10-28** (réunion d'équipe).

| ADR | Décision | Choix proposé |
|---|---|---|
| [ADR-001](ADR-001-fusion-tests-unitaires.md) | D1 · tests unitaires | reprendre `tests/p2-unitaires` maintenant |
| [ADR-002](ADR-002-monolithe-modulaire.md) | D2 · découpage | monolithe modulaire |
| [ADR-003](ADR-003-modules-complets.md) | D3 · étendue de la refacto | modules complets |
| [ADR-004](ADR-004-ranimer-le-domaine.md) | D4 · `src/domain`, `src/ports`, `src/adapters` | ranimer et brancher |
| [ADR-005](ADR-005-regles-architecture-eslint.md) | D5 · règles d'architecture | avertissement puis bloquantes |
| [ADR-006](ADR-006-rls-effective.md) | D6 · RLS | effective (`SET LOCAL ROLE`) |
| [ADR-007](ADR-007-company-id-par-trigger.md) | D7 · `company_id` sur les notes | oui, par trigger |
| [ADR-008](ADR-008-pas-de-socle-asynchrone.md) | D8 · asynchrone | aucun code, recette prête |
| [ADR-009](ADR-009-execution-worker-outbox.md) | D9 · worker d'outbox | `after()` + script de reprise |
| [ADR-010](ADR-010-live-coding.md) | D10 · fonctionnalité du live coding | sans objet, préparer `AGENTS.md` |
| [ADR-011](ADR-011-types-de-reponse.md) | D11 · types de réponse | écrits à la main |

Décisions métier D12 à D19, **validées en équipe le 2026-10-28** (D13 et D14 avec un ajout : seconde RH). D15 et D17 s'écartent de la recommandation initiale du document 21 :

| ADR | Décision | Choix |
|---|---|---|
| [ADR-012](ADR-012-codes-401-403.md) | D12 · codes 401 / 403 | 401 non connecté, 403 mauvais rôle |
| [ADR-013](ADR-013-validation-des-notes-rh.md) | D13 · notes d'une RH | validées par son manager, sinon par une autre RH |
| [ADR-014](ADR-014-changement-de-role.md) | D14 · changement de rôle | nouvelle route (seconde RH comprise), jamais son propre rôle ni la dernière RH, rôle relu en base |
| [ADR-015](ADR-015-messages-api-en-anglais.md) | D15 · langue des erreurs | API en anglais, écran inchangé |
| [ADR-016](ADR-016-domaines-publics.md) | D16 · domaines publics | inscription refusée |
| [ADR-017](ADR-017-total-par-statut.md) | D17 · total « Mes notes » | total par statut ajouté |
| [ADR-018](ADR-018-invalid-manager-409.md) | D18 · `Invalid manager` | 409, aussi pour les cycles |
| [ADR-019](ADR-019-acces-reserve-403.md) | D19 · « Accès réservé » | 403 |

Décision D20, **proposée le 2026-10-29** (revue de l'audit avant la soutenance), à valider en revue de la PR : les comportements « sans arbitrage » de `docs/audit/22-comportements-a-corriger.md` qui n'étaient ni au registre ni corrigés.

| ADR | Décision | Choix |
|---|---|---|
| [ADR-020](ADR-020-comportements-sans-arbitrage.md) | D20 · nom de l'auteur, email, date future | `authorName` dans la liste manager, casse de l'email ignorée, date refusée après demain (UTC) |
