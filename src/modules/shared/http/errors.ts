import { ConflictError, InvalidInputError, NotFoundError } from '../domain/errors'
import { describeError, log } from '../infrastructure/logger'

/** Message renvoyé pour toute erreur inattendue : jamais de stack ni de chemin (SEC-05). */
export const INTERNAL_ERROR_MESSAGE = 'Internal server error'

export function errorBody(message: string, status: number, headers?: HeadersInit): Response {
  return Response.json({ error: message }, { status, headers })
}

/**
 * Traduit une erreur en réponse du contrat. Les erreurs métier gardent leur
 * message ; les autres deviennent une 500 générique, détaillée dans le journal.
 */
export function errorResponse(error: unknown, context: { requestId?: string; method?: string; path?: string } = {}): Response {
  const headers = context.requestId ? { 'x-request-id': context.requestId } : undefined
  if (error instanceof NotFoundError) return errorBody(error.message, 404, headers)
  if (error instanceof ConflictError) return errorBody(error.message, 409, headers)
  if (error instanceof InvalidInputError) return errorBody(error.message, 400, headers)
  log('error', 'request.failed', { ...context, ...describeError(error) })
  return errorBody(INTERNAL_ERROR_MESSAGE, 500, headers)
}
