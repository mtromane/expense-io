/**
 * Module identity : inscription, connexion et acteur de la session courante.
 * API publique et assemblage des adapters (Postgres, bcrypt, Auth.js).
 */
import type { Actor, Identified } from '@/modules/shared/domain'
import { makeAuthenticate } from './application/authenticate'
import { makeResolveActor } from './application/resolveActor'
import { makeSignup } from './application/signup'
import { makeAuthJs } from './infrastructure/authjs'
import { BcryptPasswordHasher } from './infrastructure/BcryptPasswordHasher'
import { PgUserRepository, pgSignupTransaction } from './infrastructure/PgUserRepository'

export type { AuthenticatedUser } from './application/authenticate'
export type { SignupResult } from './application/signup'

const users = new PgUserRepository()
const hasher = new BcryptPasswordHasher()

export const signup = makeSignup({ users, hasher, transaction: pgSignupTransaction })
export const authenticate = makeAuthenticate({ users, hasher })
export const { handlers, auth, signIn, signOut } = makeAuthJs(authenticate)

const resolveActor = makeResolveActor({ users })

/** Session courante (jeton Auth.js décodé). */
export const getSession = () => auth()

/**
 * Identifiant de l'utilisateur d'après le jeton de session, sans requête SQL :
 * pour les routes qui n'exigent aucun rôle. Le rôle du jeton peut dater de la
 * connexion : il n'est volontairement pas exposé.
 */
export async function getSessionActor(): Promise<Identified | null> {
  const id = (await getSession())?.user?.id
  return id ? { id } : null
}

/**
 * Acteur avec son rôle actuel, relu en base (V-19, ADR-014) : pour tout
 * contrôle de rôle. Pas de cache() ici : une route de l'API ne le lit qu'une
 * fois par requête. Le rendu des pages passe par src/app/current-user.ts.
 */
export async function getActor(): Promise<Actor | null> {
  return resolveActor((await getSession())?.user?.id)
}
