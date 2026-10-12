import { request, type APIRequestContext } from '@playwright/test'
import { actor, E2E_PASSWORD, type ActorKey } from './actors'
import { withContract } from './contract'
import { BASE_URL } from './env'

export interface Credentials {
  email: string
  password: string
}

export function credentialsOf(a: { email: string }): Credentials {
  return { email: a.email, password: E2E_PASSWORD }
}

export async function anonymous(baseURL = BASE_URL): Promise<APIRequestContext> {
  return withContract(await request.newContext({ baseURL }))
}

/**
 * Connexion par les endpoints Auth.js (CSRF + callback credentials). Le
 * contexte renvoyé valide chaque réponse de l'API contre docs/api/openapi.yaml.
 */
export async function apiLogin(creds: Credentials, baseURL = BASE_URL): Promise<APIRequestContext> {
  const ctx = await request.newContext({ baseURL })
  const { csrfToken } = (await (await ctx.get('/api/auth/csrf')).json()) as { csrfToken: string }
  const res = await ctx.post('/api/auth/callback/credentials', {
    form: { email: creds.email, password: creds.password, csrfToken, callbackUrl: `${baseURL}/expenses` },
    maxRedirects: 0,
  })
  const { cookies } = await ctx.storageState()
  if (!cookies.some((c) => c.name.endsWith('authjs.session-token'))) {
    await ctx.dispose()
    throw new Error(
      `Connexion refusée pour ${creds.email} (HTTP ${res.status()}, location=${res.headers()['location']})`
    )
  }
  return withContract(ctx)
}

export async function loginAs(key: ActorKey, baseURL = BASE_URL): Promise<APIRequestContext> {
  return apiLogin(credentialsOf(actor(key)), baseURL)
}
