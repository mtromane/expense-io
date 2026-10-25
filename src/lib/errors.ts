import { errorResponse } from '@/modules/shared/http/errors'

/**
 * Réponse d'erreur du contrat : `{ error }` sans stack ni chemin interne
 * (SEC-05). Conservé pour les appelants hors `route()` ; la traduction est
 * celle de shared/http.
 */
export function respondError(error: unknown): Response {
  return errorResponse(error)
}
