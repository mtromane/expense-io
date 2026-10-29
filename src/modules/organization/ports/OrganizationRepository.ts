import type { AssignableRole, CompanyUser, HrUser, Member } from '../domain/CompanyUser'

/** Annuaire de l'entreprise, toujours borné à l'entreprise de la RH appelante. */
export interface OrganizationRepository {
  /** Employés et managers de l'entreprise de la RH, triés par nom. */
  listDirectory(hrId: string): Promise<CompanyUser[]>
  /** Employé ou manager de l'entreprise de la RH, ou null. */
  findMember(hrId: string, userId: string): Promise<CompanyUser | null>
  /** Membre de l'entreprise de la RH, quel que soit son rôle (RH comprises), ou null. */
  findCompanyMember(hrId: string, userId: string): Promise<Member | null>
  /** Fiche de la RH elle-même, ou null si l'identifiant n'est pas une RH. */
  findHr(hrId: string): Promise<HrUser | null>
  /** RH de l'entreprise de la RH, elle comprise, triées par nom. */
  listHrAdmins(hrId: string): Promise<HrUser[]>
  /** Nombre de RH de l'entreprise de la RH, sans compter `exceptUserId`. */
  countHrAdmins(hrId: string, exceptUserId: string): Promise<number>
  /** Vrai si `managerId` est un manager de l'entreprise de la RH (SEC-03). */
  isManagerOfCompany(hrId: string, managerId: string): Promise<boolean>
  /** Vrai si `userId` est déjà au-dessus de `managerId` dans la hiérarchie (le rattachement créerait un cycle). */
  isAboveInHierarchy(userId: string, managerId: string): Promise<boolean>
  /** Vrai si au moins un utilisateur est rattaché à `managerId`. */
  hasDirectReports(managerId: string): Promise<boolean>
  setManager(userId: string, managerId: string | null): Promise<CompanyUser | HrUser>
  setRole(userId: string, role: AssignableRole): Promise<Member>
}

/**
 * Changement d'organigramme d'une entreprise : exécuté seul, jamais en même
 * temps qu'un autre changement de la même entreprise. Les vérifications
 * (cycle, subordonnés, rôle du manager) et l'écriture ne peuvent donc pas se
 * croiser entre deux requêtes simultanées.
 */
export interface OrganizationTransaction {
  run<T>(hrId: string, work: (organization: OrganizationRepository) => Promise<T>): Promise<T>
}
