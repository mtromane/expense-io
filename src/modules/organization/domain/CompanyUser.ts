import type { UserRole } from '@/domain/User'

/** Employé ou manager de l'entreprise, tel que la RH le voit dans l'annuaire. */
export interface CompanyUser {
  id: string
  name: string
  email: string
  role: 'employee' | 'manager'
  managerId: string | null
}

/** Fiche de la RH elle-même : son manager valide ses notes (D13, ADR-013). */
export interface HrUser {
  id: string
  name: string
  email: string
  role: 'hr_admin'
  managerId: string | null
}

export type AssignableRole = CompanyUser['role']

/** Message du contrat pour un rattachement refusé (autre entreprise, soi-même, cycle). */
export const INVALID_MANAGER = 'Invalid manager'

/** Message du contrat pour la rétrogradation d'un manager qui a encore des subordonnés (D14). */
export const MANAGER_HAS_DIRECT_REPORTS = 'Manager has direct reports'

/** Un utilisateur ne peut pas être son propre manager. */
export function isSelfAssignment(userId: string, managerId: string): boolean {
  return userId === managerId
}

/** Rôles que la RH peut attribuer (D14) : pas de seconde RH. */
export function isAssignableRole(value: unknown): value is AssignableRole {
  return value === 'employee' || value === 'manager'
}

/** Rétrogradation d'un manager vers employé. */
export function isDemotion(from: UserRole, to: AssignableRole): boolean {
  return from === 'manager' && to === 'employee'
}
