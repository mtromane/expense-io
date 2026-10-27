import type { UserRole } from '@/domain/User'
import { getActor, getSessionActor } from '@/modules/identity'
import { isUuid, type Actor, type Identified } from '../domain'
import { errorBody, errorResponse } from './errors'

/**
 * Accès à une route : sans session → 401, session sans le rôle exigé → 403
 * (D12, ADR-012 ; l'application d'origine mélangeait les deux).
 */
export interface Access {
  role?: UserRole
}

export interface RouteContext<P, A extends Identified = Actor> {
  request: Request
  actor: A
  params: P
  requestId: string
}

type Handler<P, A extends Identified> = (context: RouteContext<P, A>) => Promise<Response>
type RouteHandler<P> = (request: Request, segment: { params: Promise<P> }) => Promise<Response>
type Params = Record<string, string>

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
/** Route réservée à un rôle : l'acteur porte son rôle actuel, relu en base (une requête). */
export function route<P extends Params = Record<string, never>>(
  access: { role: UserRole },
  handler: Handler<P, Actor>
): RouteHandler<P>
/** Route ouverte à toute session : seul l'identifiant du jeton est fourni, sans requête SQL. */
export function route<P extends Params = Record<string, never>>(
  access: Record<string, never>,
  handler: Handler<P, Identified>
): RouteHandler<P>
export function route<P extends Params>(access: Access, handler: Handler<P, Actor>): RouteHandler<P> {
  return async (request, segment) => {
    const requestId = requestIdOf(request)
    const path = new URL(request.url).pathname
    try {
      // Rôle exigé : rôle actuel relu en base (une requête). Sinon, identifiant du jeton seul (aucune requête).
      const actor = access.role ? await getActor() : await getSessionActor()
      if (!actor) return withRequestId(errorBody('Unauthorized', 401), requestId)
      // Même message qu'à l'origine sur les 403 de /api/hr/* : seul le code change.
      if (access.role && (actor as Actor).role !== access.role) return withRequestId(errorBody('Unauthorized', 403), requestId)
      const params = ((await segment?.params) ?? {}) as P
      if ('id' in params && !isUuid(params.id)) {
        return withRequestId(errorBody('Not found', 404), requestId)
      }
      // Sans rôle exigé, la surcharge ne promet au handler que `Identified`.
      const response = await handler({ request, actor: actor as Actor, params, requestId })
      return withRequestId(response, requestId)
    } catch (error) {
      return errorResponse(error, { requestId, method: request.method, path })
    }
  }
}
