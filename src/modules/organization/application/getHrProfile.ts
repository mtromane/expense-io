import { NotFoundError, type Actor } from '@/modules/shared/domain'
import type { HrUser } from '../domain/CompanyUser'
import type { OrganizationRepository } from '../ports/OrganizationRepository'

/** Fiche de la RH connectée, dont le manager qui valide ses notes (D13, ADR-013). */
export function makeGetHrProfile(deps: { organization: OrganizationRepository }) {
  return async (actor: Actor): Promise<HrUser> => {
    const hr = await deps.organization.findHr(actor.id)
    if (!hr) throw new NotFoundError()
    return hr
  }
}
