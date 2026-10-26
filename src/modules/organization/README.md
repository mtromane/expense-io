# Module `organization`

Annuaire de l'entreprise, rattachement à un manager, rôle des membres et fiche de la RH. Réservé à la RH.

| Couche | Fichier | Rôle |
|---|---|---|
| domain | `CompanyUser.ts` | membre de l'annuaire, fiche RH (`HrUser`), `INVALID_MANAGER`, `MANAGER_HAS_DIRECT_REPORTS`, refus de l'auto-rattachement, rôles attribuables (employé ↔ manager) |
| application | `listDirectory.ts` | employés et managers de l'entreprise de la RH, triés par nom |
| application | `assignManager.ts` | rattache ou détache un membre, **ou la RH elle-même** (son manager valide ses notes : D13) ; le manager doit être un manager de la **même** entreprise (SEC-03), sans créer de cycle (D18, MET-04) ; un corps invalide est refusé sans rien modifier (ROB-03e) |
| application | `changeRole.ts` | nomme un employé manager ou rétrograde un manager (D14) ; rétrogradation refusée s'il a encore des subordonnés (`409 Manager has direct reports`) |
| application | `getHrProfile.ts` | fiche de la RH connectée, dont son manager (D13) |
| ports | `OrganizationRepository.ts` | toutes les méthodes prennent l'identifiant de la RH : la requête est bornée à son entreprise |
| infrastructure | `PgOrganizationRepository.ts` | Postgres, une requête par lecture ; cycle détecté par une requête récursive qui remonte la chaîne des managers |

API publique : `listDirectory`, `assignManager`, `changeRole`, `getHrProfile`, types `CompanyUser`, `HrUser`.

Routes : `GET /api/hr/users`, `PUT /api/hr/users/:id/manager`, `PUT /api/hr/users/:id/role`, `GET /api/hr/me`.

Tests : `tests/unit/modules/organization.test.ts`.
