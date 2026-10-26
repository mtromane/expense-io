import type { AssignableRole, CompanyUser, HrUser } from '../domain/CompanyUser'

/** Annuaire de l'entreprise, toujours borné à l'entreprise de la RH appelante. */
export interface OrganizationRepository {
  /** Employés et managers de l'entreprise de la RH, triés par nom. */
  listDirectory(hrId: string): Promise<CompanyUser[]>
  /** Employé ou manager de l'entreprise de la RH, ou null. */
  findMember(hrId: string, userId: string): Promise<CompanyUser | null>
  /** Fiche de la RH elle-même, ou null si l'identifiant n'est pas une RH. */
  findHr(hrId: string): Promise<HrUser | null>
  /** Vrai si `managerId` est un manager de l'entreprise de la RH (SEC-03). */
  isManagerOfCompany(hrId: string, managerId: string): Promise<boolean>
  /** Vrai si `userId` est déjà au-dessus de `managerId` dans la hiérarchie (le rattachement créerait un cycle). */
  isAboveInHierarchy(userId: string, managerId: string): Promise<boolean>
  /** Vrai si au moins un utilisateur est rattaché à `managerId`. */
  hasDirectReports(managerId: string): Promise<boolean>
  setManager(userId: string, managerId: string | null): Promise<CompanyUser | HrUser>
  setRole(userId: string, role: AssignableRole): Promise<CompanyUser>
}
