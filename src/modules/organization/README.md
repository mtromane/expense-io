# Module `organization`

Annuaire de l'entreprise, rattachement à un manager, rôle des membres et fiche de la RH. Réservé à la RH.

| Couche | Fichier | Rôle |
|---|---|---|
| domain | `CompanyUser.ts` | membre de l'annuaire, fiche RH (`HrUser`), `INVALID_MANAGER`, `MANAGER_HAS_DIRECT_REPORTS`, `LAST_HR_ADMIN`, `CANNOT_CHANGE_OWN_ROLE`, refus de l'auto-rattachement, rôles attribuables (employé, manager, RH) |
| application | `listDirectory.ts` | employés et managers de l'entreprise de la RH, triés par nom |
| application | `assignManager.ts` | rattache ou détache un membre, **ou la RH elle-même** (son manager valide ses notes : D13) ; le manager doit être un manager de la **même** entreprise (SEC-03), sans créer de cycle (D18, MET-04) ; un corps invalide est refusé sans rien modifier (ROB-03e) |
| application | `changeRole.ts` | change le rôle d'un membre : employé, manager ou RH (D14, seconde RH depuis le 2026-10-28). Refusé en `409` : son propre rôle (`Cannot change own role`), la dernière RH (`Last HR admin`), un manager qui a encore des subordonnés et cesserait de l'être (`Manager has direct reports`). Un manager sans manager peut être rétrogradé, ses notes vont alors à la RH (MET-02) |
| application | `listHrAdmins.ts` | RH de l'entreprise, la RH connectée comprise (section « Équipe RH » de la console) |
| application | `getHrProfile.ts` | fiche de la RH connectée, dont son manager (D13) |
| ports | `OrganizationRepository.ts` | toutes les méthodes prennent l'identifiant de la RH : la requête est bornée à son entreprise |
| ports | `OrganizationTransaction` | changement d'organigramme exécuté seul pour son entreprise : vérifications et écriture ne se croisent jamais |
| infrastructure | `PgOrganizationRepository.ts` | Postgres, une requête par lecture ; cycle détecté par une requête récursive qui remonte la chaîne des managers ; `pgOrganizationTransaction` : transaction avec verrou consultatif par entreprise (`pg_advisory_xact_lock`) pour le rattachement et le changement de rôle |

API publique : `listDirectory`, `assignManager`, `changeRole`, `getHrProfile`, `listHrAdmins`, types `CompanyUser`, `HrUser`, `Member`.

Routes : `GET /api/hr/users`, `PUT /api/hr/users/:id/manager`, `PUT /api/hr/users/:id/role`, `GET /api/hr/me`, `GET /api/hr/admins`.

Tests : `tests/unit/modules/organization.test.ts`.
