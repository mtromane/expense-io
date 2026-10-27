/**
 * Module identity : inscription, connexion et acteur de la session courante.
 * API publique et assemblage des adapters (Postgres, bcrypt, Auth.js).
 */
import { cache } from 'react'
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

/** Session courante, décodée une seule fois par rendu (layout et page la partagent). */
export const getSession = cache(() => auth())

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
 * contrôle de rôle. Une seule lecture par rendu.
 */
export const getActor = cache(async (): Promise<Actor | null> => resolveActor((await getSession())?.user?.id))
