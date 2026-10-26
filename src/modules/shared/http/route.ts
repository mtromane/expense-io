import type { UserRole } from '@/domain/User'
import { getActor } from '@/modules/identity'
import type { Actor } from '../domain/Actor'
import { errorBody, errorResponse } from './errors'

/**
 * Accès à une route : sans session → 401, session sans le rôle exigé → 403
 * (D12, ADR-012 ; l'application d'origine mélangeait les deux).
 */
export interface Access {
  role?: UserRole
}

export interface RouteContext<P> {
  request: Request
  actor: Actor
  params: P
  requestId: string
}

type Handler<P> = (context: RouteContext<P>) => Promise<Response>

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const REQUEST_ID_PATTERN = /^[\w-]{1,64}$/

function requestIdOf(request: Request): string {
  const incoming = request.headers.get('x-request-id')
  return incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : crypto.randomUUID()
}

function withRequestId(response: Response, requestId: string): Response {
  response.headers.set('x-request-id', requestId)
  return response
}

/**
 * Contrôleur HTTP commun à toutes les routes de l'API : garde de session et de
 * rôle, identifiant d'URL validé (un `id` qui n'est pas un UUID donne la même
 * réponse qu'une note inexistante), traitement attendu dans le `try` et
 * erreurs traduites sans fuite d'information.
 */
export function route<P extends Record<string, string> = Record<string, never>>(access: Access, handler: Handler<P>) {
  return async (request: Request, segment: { params: Promise<P> }): Promise<Response> => {
    const requestId = requestIdOf(request)
    const path = new URL(request.url).pathname
    try {
      const actor = await getActor()
      if (!actor) return withRequestId(errorBody('Unauthorized', 401), requestId)
      // Même message qu'à l'origine sur les 403 de /api/hr/* : seul le code change.
      if (access.role && actor.role !== access.role) return withRequestId(errorBody('Unauthorized', 403), requestId)
      const params = ((await segment?.params) ?? {}) as P
      if ('id' in params && !UUID_PATTERN.test(params.id)) {
        return withRequestId(errorBody('Not found', 404), requestId)
      }
      const response = await handler({ request, actor, params, requestId })
      return withRequestId(response, requestId)
    } catch (error) {
      return errorResponse(error, { requestId, method: request.method, path })
    }
  }
}
