import type { UserRole } from '@/domain/User'
import type { Actor } from '@/modules/shared/domain'

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
  /** Identifiant et rôle **actuel** d'un utilisateur, ou null s'il n'existe plus. */
  findActor(id: string): Promise<Actor | null>
  emailExists(email: string): Promise<boolean>
  /**
   * Entreprise du domaine, créée si elle n'existe pas encore ; `created` est
   * vrai seulement pour l'appel qui l'a créée (création concurrente sûre).
   */
  claimCompany(name: string, emailDomain: string): Promise<{ companyId: string; created: boolean }>
  /** Crée le compte ; false si l'email est déjà pris (inscription simultanée), sans rien écrire. */
  createUser(user: NewUser): Promise<boolean>
}

/**
 * Inscription d'un seul tenant : entreprise et premier compte sont créés
 * ensemble ou pas du tout (pas d'entreprise sans RH si le compte échoue).
 */
export interface SignupTransaction {
  run<T>(work: (users: UserRepository) => Promise<T>): Promise<T>
}
