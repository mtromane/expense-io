import type { Actor } from '@/modules/shared/domain'
import type { HrUser } from '../domain/CompanyUser'
import type { OrganizationRepository } from '../ports/OrganizationRepository'

/** RH de l'entreprise, la RH connectée comprise (réunion du 2026-10-28, ADR-014). */
export function makeListHrAdmins(deps: { organization: OrganizationRepository }) {
  return (actor: Actor): Promise<HrUser[]> => deps.organization.listHrAdmins(actor.id)
}
