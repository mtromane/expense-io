import type { Actor } from '@/modules/shared/domain'
import type { PasswordHasher } from '../ports/PasswordHasher'
import type { UserRepository } from '../ports/UserRepository'

export interface AuthenticatedUser extends Actor {
  email: string
}

/** Vérifie des identifiants ; null si l'email est inconnu ou le mot de passe faux (même réponse). */
export function makeAuthenticate(deps: { users: UserRepository; hasher: PasswordHasher }) {
  return async (email: string, password: string): Promise<AuthenticatedUser | null> => {
    const user = await deps.users.findCredentials(email)
    if (!user) return null
    if (!(await deps.hasher.verify(password, user.passwordHash))) return null
    return { id: user.id, email: user.email, role: user.role }
  }
}
