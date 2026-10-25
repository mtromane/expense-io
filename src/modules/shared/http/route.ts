import type { UserRole } from '@/domain/User'
import { auth } from '@/lib/auth'
import type { Actor } from '../domain/Actor'
import { errorBody, errorResponse } from './errors'

/**
 * Accès à une route. `deniedStatus` est la réponse à un appel sans session ou
 * avec le mauvais rôle : 401 sur /api/manager/* et /api/expense-notes, 403 sur
 * /api/hr/*. Cette incohérence fait partie du contrat actuel (D12 non tranchée) :
 * la corriger revient à changer une valeur ici.
 */
export interface Access {
  role?: UserRole
  deniedStatus: 401 | 403
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
      const session = await auth()
      const user = session?.user
      if (!user?.id || (access.role && user.role !== access.role)) {
        return withRequestId(errorBody('Unauthorized', access.deniedStatus), requestId)
      }
      const params = ((await segment?.params) ?? {}) as P
      if ('id' in params && !UUID_PATTERN.test(params.id)) {
        return withRequestId(errorBody('Not found', 404), requestId)
      }
      const response = await handler({ request, actor: { id: user.id, role: user.role }, params, requestId })
      return withRequestId(response, requestId)
    } catch (error) {
      return errorResponse(error, { requestId, method: request.method, path })
    }
  }
}
