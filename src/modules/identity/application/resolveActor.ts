import type { Actor } from '@/modules/shared/domain'
import type { UserRepository } from '../ports/UserRepository'

/**
 * Acteur d'une session : le jeton ne sert qu'à identifier l'utilisateur, son
 * rôle est relu en base (V-19, ADR-014). Une promotion ou une rétrogradation
 * prend effet à la requête suivante, sans reconnexion ; un compte supprimé
 * perd l'accès immédiatement.
 */
export function makeResolveActor(deps: { users: UserRepository }) {
  return async (sessionUserId: string | null | undefined): Promise<Actor | null> =>
    sessionUserId ? deps.users.findActor(sessionUserId) : null
}
