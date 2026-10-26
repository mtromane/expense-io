import type { UserRole } from '@/domain/User'

/** Ce qu'il faut pour vérifier une connexion. */
export interface UserCredentials {
  id: string
  email: string
  passwordHash: string
  role: UserRole
}

export interface NewUser {
  name: string
  email: string
  passwordHash: string
  companyId: string
  role: UserRole
}

/** Comptes et rattachement à l'entreprise au moment de l'inscription. */
export interface UserRepository {
  findCredentials(email: string): Promise<UserCredentials | null>
  emailExists(email: string): Promise<boolean>
  /**
   * Entreprise du domaine, créée si elle n'existe pas encore ; `created` est
   * vrai seulement pour l'appel qui l'a créée (création concurrente sûre).
   */
  claimCompany(name: string, emailDomain: string): Promise<{ companyId: string; created: boolean }>
  createUser(user: NewUser): Promise<void>
}
