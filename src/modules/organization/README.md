# Module `organization`

Annuaire de l'entreprise et rattachement des employés et managers à un manager. Réservé à la RH.

| Couche | Fichier | Rôle |
|---|---|---|
| domain | `CompanyUser.ts` | membre de l'annuaire, `INVALID_MANAGER`, refus de l'auto-rattachement |
| application | `listDirectory.ts` | employés et managers de l'entreprise de la RH, triés par nom |
| application | `assignManager.ts` | rattache ou détache un membre ; le manager doit être un manager de la **même** entreprise (SEC-03), un corps invalide est refusé sans rien modifier (ROB-03e) |
| ports | `OrganizationRepository.ts` | toutes les méthodes prennent l'identifiant de la RH : la requête est bornée à son entreprise |
| infrastructure | `PgOrganizationRepository.ts` | Postgres, une requête par lecture |

API publique : `listDirectory`, `assignManager`, type `CompanyUser`.

Routes : `GET /api/hr/users`, `PUT /api/hr/users/:id/manager`.

Tests : `tests/unit/modules/organization.test.ts`.
