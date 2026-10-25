# Décisions d'architecture (ADR)

Une ADR par décision D1 à D11 de [`docs/audit/21-decisions-architecture.md`](../../audit/21-decisions-architecture.md).
Le numéro de l'ADR reprend celui de la décision (ADR-002 = D2). Chacune applique la recommandation du document 21.

**Statut de toutes les ADR : Proposée, à valider par l'équipe.**

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

Les décisions D12 à D19 (comportements visibles) ne sont pas tranchées : aucune n'est implémentée.
