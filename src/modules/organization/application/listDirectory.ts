import type { Actor } from '@/modules/shared/domain'
import type { CompanyUser } from '../domain/CompanyUser'
import type { OrganizationRepository } from '../ports/OrganizationRepository'

export function makeListDirectory(deps: { organization: OrganizationRepository }) {
  return (actor: Actor): Promise<CompanyUser[]> => deps.organization.listDirectory(actor.id)
}
