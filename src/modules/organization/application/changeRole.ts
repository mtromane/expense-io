import { ConflictError, InvalidInputError, NotFoundError, type Actor } from '@/modules/shared/domain'
import { isAssignableRole, isDemotion, MANAGER_HAS_DIRECT_REPORTS, type AssignableRole, type CompanyUser } from '../domain/CompanyUser'
import type { OrganizationRepository } from '../ports/OrganizationRepository'

export interface ChangeRoleCommand {
  actor: Actor
  userId: string
  /** Corps décodé (`{ role: 'employee' | 'manager' }`), ou undefined si le corps n'est pas du JSON. */
  input: unknown
}

function roleOf(input: unknown): AssignableRole {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new InvalidInputError()
  const role = (input as { role?: unknown }).role
  if (!isAssignableRole(role)) throw new InvalidInputError()
  return role
}

/**
 * Nomme un employé manager, ou rétrograde un manager en employé (D14,
 * ADR-014). Borné à l'entreprise de la RH ; une RH n'est pas concernée. Un
 * manager qui a encore des subordonnés ne peut pas être rétrogradé : la RH
 * les réaffecte d'abord (sinon leurs notes n'auraient plus de valideur, M-08).
 */
export function makeChangeRole(deps: { organization: OrganizationRepository }) {
  return async ({ actor, userId, input }: ChangeRoleCommand): Promise<CompanyUser> => {
    const member = await deps.organization.findMember(actor.id, userId)
    if (!member) throw new NotFoundError()
    const role = roleOf(input)
    if (member.role === role) return member
    if (isDemotion(member.role, role) && (await deps.organization.hasDirectReports(userId))) {
      throw new ConflictError(MANAGER_HAS_DIRECT_REPORTS)
    }
    return deps.organization.setRole(userId, role)
  }
}
