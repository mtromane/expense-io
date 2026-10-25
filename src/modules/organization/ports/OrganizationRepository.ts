import type { CompanyUser } from '../domain/CompanyUser'

/** Annuaire de l'entreprise, toujours borné à l'entreprise de la RH appelante. */
export interface OrganizationRepository {
  /** Employés et managers de l'entreprise de la RH, triés par nom. */
  listDirectory(hrId: string): Promise<CompanyUser[]>
  /** Employé ou manager de l'entreprise de la RH, ou null. */
  findMember(hrId: string, userId: string): Promise<CompanyUser | null>
  /** Vrai si `managerId` est un manager de l'entreprise de la RH (SEC-03). */
  isManagerOfCompany(hrId: string, managerId: string): Promise<boolean>
  setManager(userId: string, managerId: string | null): Promise<CompanyUser>
}
