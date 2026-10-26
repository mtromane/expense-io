/**
 * Module identity : inscription, connexion et acteur de la session courante.
 * API publique et assemblage des adapters (Postgres, bcrypt, Auth.js).
 */
import type { Actor } from '@/modules/shared/domain'
import { makeAuthenticate } from './application/authenticate'
import { makeSignup } from './application/signup'
import { makeAuthJs } from './infrastructure/authjs'
import { BcryptPasswordHasher } from './infrastructure/BcryptPasswordHasher'
import { PgUserRepository } from './infrastructure/PgUserRepository'

export type { AuthenticatedUser } from './application/authenticate'
export type { SignupResult } from './application/signup'

const users = new PgUserRepository()
const hasher = new BcryptPasswordHasher()

export const signup = makeSignup({ users, hasher })
export const authenticate = makeAuthenticate({ users, hasher })
export const { handlers, auth, signIn, signOut } = makeAuthJs(authenticate)

/** Acteur de la session courante, ou null sans session. */
export async function getActor(): Promise<Actor | null> {
  const user = (await auth())?.user
  return user?.id ? { id: user.id, role: user.role } : null
}
