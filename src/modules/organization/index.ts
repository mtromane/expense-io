/**
 * Module organization : annuaire de l'entreprise, rattachement et rôle des
 * membres, fiche de la RH, réservés à la RH. API publique et assemblage des
 * adapters.
 */
import { makeAssignManager } from './application/assignManager'
import { makeChangeRole } from './application/changeRole'
import { makeGetHrProfile } from './application/getHrProfile'
import { makeListDirectory } from './application/listDirectory'
import { PgOrganizationRepository } from './infrastructure/PgOrganizationRepository'

export type { CompanyUser, HrUser } from './domain/CompanyUser'

const organization = new PgOrganizationRepository()

export const listDirectory = makeListDirectory({ organization })
export const assignManager = makeAssignManager({ organization })
export const changeRole = makeChangeRole({ organization })
export const getHrProfile = makeGetHrProfile({ organization })
