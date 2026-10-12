import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { APIRequestContext, APIResponse } from '@playwright/test'
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { parse } from 'yaml'

/**
 * Contrat d'API : docs/api/openapi.yaml. Chaque réponse obtenue via les
 * contextes de tests/support/auth.ts est validée contre l'opération, le code
 * HTTP et le schéma (strict) qui y sont décrits.
 */

type Json = Record<string, unknown>

const SPEC_FILE = path.join(process.cwd(), 'docs/api/openapi.yaml')
const spec = parse(readFileSync(SPEC_FILE, 'utf8')) as {
  paths: Record<string, Record<string, Json>>
  components: { schemas: Record<string, Json>; responses: Record<string, Json> }
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete']

/** « GET /api/expense-notes », etc. */
export const CONTRACT_OPERATIONS = new Set(
  Object.entries(spec.paths).flatMap(([route, item]) =>
    Object.keys(item)
      .filter((key) => HTTP_METHODS.includes(key))
      .map((method) => `${method.toUpperCase()} ${route}`)
  )
)

// Les schémas nommés deviennent des schémas Ajv identifiés par leur nom ;
// les `$ref: '#/components/schemas/X'` sont réécrits en `X`.
function rewriteRefs<T>(value: T): T {
  if (Array.isArray(value)) return value.map(rewriteRefs) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) =>
        key === '$ref' && typeof inner === 'string' && inner.startsWith('#/components/schemas/')
          ? [key, inner.slice('#/components/schemas/'.length)]
          : [key, rewriteRefs(inner)]
      )
    ) as T
  }
  return value
}

const ajv = new Ajv2020({ allErrors: true, strict: false })
addFormats(ajv)
for (const [name, schema] of Object.entries(spec.components.schemas)) {
  ajv.addSchema(rewriteRefs({ ...schema, $id: name }))
}

const ROUTES = Object.keys(spec.paths).map((route) => ({
  route,
  pattern: new RegExp(`^${route.replace(/\{[^}]+\}/g, '[^/]+')}$`),
  literalSegments: route.split('/').filter((s) => s && !s.startsWith('{')).length,
}))

function matchRoute(pathname: string): string | undefined {
  return ROUTES.filter((r) => r.pattern.test(pathname)).sort((a, b) => b.literalSegments - a.literalSegments)[0]?.route
}

const validators = new Map<string, ValidateFunction>()

function responseObject(response: Json): Json {
  const ref = response.$ref
  if (typeof ref === 'string' && ref.startsWith('#/components/responses/')) {
    return spec.components.responses[ref.slice('#/components/responses/'.length)]
  }
  return response
}

/** Liste des écarts au contrat (vide si conforme). */
export function validateResponse(method: string, pathname: string, status: number, body: unknown): string[] {
  const route = matchRoute(pathname)
  if (!route) return [`${method} ${pathname} : chemin absent du contrat`]
  const operation = spec.paths[route][method.toLowerCase()] as Json | undefined
  if (!operation) return [`${method} ${route} : opération absente du contrat`]
  const responses = operation.responses as Record<string, Json>
  const declared = responses[String(status)]
  if (!declared) {
    return [`${method} ${route} : code ${status} non documenté (attendus : ${Object.keys(responses).join(', ')})`]
  }
  const content = responseObject(declared).content as Record<string, { schema: Json }> | undefined
  const schema = content?.['application/json']?.schema
  if (!schema) return []
  const key = `${method} ${route} ${status}`
  let validate = validators.get(key)
  if (!validate) {
    validate = ajv.compile(rewriteRefs(schema))
    validators.set(key, validate)
  }
  if (validate(body)) return []
  return (validate.errors ?? []).map(
    (e) => `${method} ${route} ${status} : ${e.instancePath || '(racine)'} ${e.message}${e.params ? ` ${JSON.stringify(e.params)}` : ''}`
  )
}

async function assertContract(method: string, res: APIResponse): Promise<void> {
  const { pathname } = new URL(res.url())
  if (!pathname.startsWith('/api/') || pathname.startsWith('/api/auth/')) return
  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = undefined
  }
  const errors = validateResponse(method, pathname, res.status(), body)
  if (errors.length > 0) {
    throw new Error(`Réponse hors contrat (docs/api/openapi.yaml) :\n- ${errors.join('\n- ')}`)
  }
}

const CHECKED = new Set(['get', 'post', 'put', 'patch', 'delete', 'fetch'])

/** Enveloppe un contexte HTTP : chaque réponse de l'API est validée contre le contrat. */
export function withContract(ctx: APIRequestContext): APIRequestContext {
  return new Proxy(ctx, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== 'function') return value
      if (typeof prop === 'string' && CHECKED.has(prop)) {
        return async (url: string, options?: { method?: string }) => {
          const res: APIResponse = await value.call(target, url, options)
          const method = prop === 'fetch' ? (options?.method ?? 'GET') : prop.toUpperCase()
          await assertContract(method.toUpperCase(), res)
          return res
        }
      }
      return value.bind(target)
    },
  })
}
