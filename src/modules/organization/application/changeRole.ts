import { ConflictError, InvalidInputError, NotFoundError, type Actor } from '@/modules/shared/domain'
import {
  CANNOT_CHANGE_OWN_ROLE,
  isAssignableRole,
  LAST_HR_ADMIN,
  leavesHrRole,
  leavesManagerRole,
  MANAGER_HAS_DIRECT_REPORTS,
  type AssignableRole,
  type Member,
} from '../domain/CompanyUser'
import type { OrganizationTransaction } from '../ports/OrganizationRepository'

export interface ChangeRoleCommand {
  actor: Actor
  userId: string
  /** Corps décodé (`{ role: 'employee' | 'manager' | 'hr_admin' }`), ou undefined si le corps n'est pas du JSON. */
  input: unknown
}

function roleOf(input: unknown): AssignableRole {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new InvalidInputError()
  const role = (input as { role?: unknown }).role
  if (!isAssignableRole(role)) throw new InvalidInputError()
  return role
}

/**
 * Change le rôle d'un membre de l'entreprise de la RH : employé, manager ou
 * RH (D14, ADR-014 ; seconde RH depuis la réunion du 2026-10-28). Règles :
 * - une RH ne change jamais son propre rôle (409, comme l'auto-rattachement) ;
 * - un manager qui a encore des subordonnés ne cesse pas d'être manager
 *   (ni employé, ni RH) : leurs notes n'auraient plus de valideur (M-08) ;
 * - une entreprise garde toujours au moins une RH.
 * Tout s'exécute dans la transaction verrouillée par entreprise : deux RH qui
 * se rétrogradent l'une l'autre en même temps ne peuvent pas aboutir toutes
 * les deux (la seconde voit qu'il ne resterait plus de RH).
 */
export function makeChangeRole(deps: { transaction: OrganizationTransaction }) {
  return ({ actor, userId, input }: ChangeRoleCommand): Promise<Member> =>
    deps.transaction.run(actor.id, async (organization) => {
      const member = await organization.findCompanyMember(actor.id, userId)
      if (!member) throw new NotFoundError()
      if (member.id === actor.id) throw new ConflictError(CANNOT_CHANGE_OWN_ROLE)
      const role = roleOf(input)
      if (member.role === role) return member
      if (leavesManagerRole(member.role, role) && (await organization.hasDirectReports(userId))) {
        throw new ConflictError(MANAGER_HAS_DIRECT_REPORTS)
      }
      if (leavesHrRole(member.role, role) && (await organization.countHrAdmins(actor.id, userId)) === 0) {
        throw new ConflictError(LAST_HR_ADMIN)
      }
      return organization.setRole(userId, role)
    })
}
