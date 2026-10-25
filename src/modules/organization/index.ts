/**
 * Module organization : annuaire de l'entreprise et rattachement des
 * managers, réservés à la RH. API publique et assemblage des adapters.
 */
import { makeAssignManager } from './application/assignManager'
import { makeListDirectory } from './application/listDirectory'
import { PgOrganizationRepository } from './infrastructure/PgOrganizationRepository'

export type { CompanyUser } from './domain/CompanyUser'

const organization = new PgOrganizationRepository()

export const listDirectory = makeListDirectory({ organization })
export const assignManager = makeAssignManager({ organization })
