import type { UserRole } from '@/domain/User'

/** Employé ou manager de l'entreprise, tel que la RH le voit dans l'annuaire. */
export interface CompanyUser {
  id: string
  name: string
  email: string
  role: 'employee' | 'manager'
  managerId: string | null
}

/** Fiche d'une RH de l'entreprise : son manager, s'il y en a un, valide ses notes (D13, ADR-013). */
export interface HrUser {
  id: string
  name: string
  email: string
  role: 'hr_admin'
  managerId: string | null
}

/** Membre de l'entreprise, quel que soit son rôle. */
export type Member = CompanyUser | HrUser

/** Rôles que la RH peut attribuer (D14, complété le 2026-10-28 : une RH peut en nommer une autre). */
export type AssignableRole = UserRole

/** Message du contrat pour un rattachement refusé (autre entreprise, soi-même, cycle). */
export const INVALID_MANAGER = 'Invalid manager'

/**
 * Message du contrat quand un manager qui a encore des subordonnés perdrait son
 * rôle (rétrogradé ou nommé RH) : leurs notes n'auraient plus de valideur (D14).
 */
export const MANAGER_HAS_DIRECT_REPORTS = 'Manager has direct reports'

/** Message du contrat : une entreprise garde toujours au moins une RH (D14, 2026-10-28). */
export const LAST_HR_ADMIN = 'Last HR admin'

/** Message du contrat : une RH ne change jamais son propre rôle (D14, 2026-10-28). */
export const CANNOT_CHANGE_OWN_ROLE = 'Cannot change own role'

/** Un utilisateur ne peut pas être son propre manager. */
export function isSelfAssignment(userId: string, managerId: string): boolean {
  return userId === managerId
}

export function isAssignableRole(value: unknown): value is AssignableRole {
  return value === 'employee' || value === 'manager' || value === 'hr_admin'
}

/** Un manager cesse de l'être (rétrogradé employé ou nommé RH). */
export function leavesManagerRole(from: UserRole, to: AssignableRole): boolean {
  return from === 'manager' && to !== 'manager'
}

/** Une RH cesse de l'être. */
export function leavesHrRole(from: UserRole, to: AssignableRole): boolean {
  return from === 'hr_admin' && to !== 'hr_admin'
}
