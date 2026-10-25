import type { UserRole } from '@/domain/User'

/** Utilisateur authentifié au nom duquel un cas d'usage s'exécute. */
export interface Actor {
  id: string
  role: UserRole
}
