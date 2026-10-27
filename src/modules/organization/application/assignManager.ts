import { ConflictError, InvalidInputError, NotFoundError, type Actor } from '@/modules/shared/domain'
import { INVALID_MANAGER, isSelfAssignment, type CompanyUser, type HrUser } from '../domain/CompanyUser'
import type { OrganizationTransaction } from '../ports/OrganizationRepository'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface AssignManagerCommand {
  actor: Actor
  userId: string
  /** Corps décodé (`{ managerId?: string | null }`), ou undefined si le corps n'est pas du JSON. */
  input: unknown
}

/** `managerId` absent ou null retire le manager ; sinon un UUID est exigé. */
function managerIdOf(input: unknown): string | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new InvalidInputError()
  const managerId = (input as { managerId?: unknown }).managerId ?? null
  if (managerId === null) return null
  if (typeof managerId !== 'string' || !UUID_PATTERN.test(managerId)) throw new InvalidInputError()
  return managerId
}

/**
 * Rattache (ou détache) un employé ou un manager de l'entreprise de la RH, ou
 * la RH elle-même (son manager valide alors ses notes : D13, ADR-013). Le
 * manager choisi doit être un manager de la même entreprise (SEC-03), et le
 * rattachement ne doit pas créer de cycle hiérarchique (D18, MET-04), y
 * compris face à un rattachement simultané (transaction de l'organigramme).
 */
export function makeAssignManager(deps: { transaction: OrganizationTransaction }) {
  return ({ actor, userId, input }: AssignManagerCommand): Promise<CompanyUser | HrUser> =>
    deps.transaction.run(actor.id, async (organization) => {
      const member =
        userId === actor.id ? await organization.findHr(actor.id) : await organization.findMember(actor.id, userId)
      if (!member) throw new NotFoundError()
      const managerId = managerIdOf(input)
      if (managerId !== null) {
        if (isSelfAssignment(userId, managerId)) throw new ConflictError(INVALID_MANAGER)
        if (!(await organization.isManagerOfCompany(actor.id, managerId))) throw new ConflictError(INVALID_MANAGER)
        if (await organization.isAboveInHierarchy(userId, managerId)) throw new ConflictError(INVALID_MANAGER)
      }
      return organization.setManager(userId, managerId)
    })
}
