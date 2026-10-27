import type { UserRole } from '@/domain/User'

/** Utilisateur authentifié au nom duquel un cas d'usage s'exécute, avec son rôle actuel (relu en base). */
export interface Actor {
  id: string
  role: UserRole
}

/**
 * Utilisateur authentifié dont seul l'identifiant est connu (jeton de
 * session) : routes sans rôle exigé. Pas de rôle, pour qu'un rôle périmé ne
 * puisse pas servir à une décision (V-19).
 */
export type Identified = Pick<Actor, 'id'>
