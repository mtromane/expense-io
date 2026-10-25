/** Employé ou manager de l'entreprise, tel que la RH le voit dans l'annuaire. */
export interface CompanyUser {
  id: string
  name: string
  email: string
  role: 'employee' | 'manager'
  managerId: string | null
}

/** Message du contrat pour un rattachement refusé. */
export const INVALID_MANAGER = 'Invalid manager'

/** Un utilisateur ne peut pas être son propre manager. */
export function isSelfAssignment(userId: string, managerId: string): boolean {
  return userId === managerId
}
