import { beforeAll, describe, expect, it, vi } from 'vitest'

/**
 * Garde des pages protégées (src/proxy.ts). `auth()` est remplacé par un
 * simple passe-plat : le test fournit lui-même la session (`req.auth`).
 * Le parcours réel (cookie, redirection navigateur) est couvert par
 * tests/e2e/guards.spec.ts.
 */

vi.mock('@/lib/auth', () => ({
  auth: (handler: unknown) => handler,
}))

type ProxyHandler = (req: { nextUrl: URL; auth: unknown }) => Response | undefined | void

let proxy: ProxyHandler

beforeAll(async () => {
  proxy = (await import('@/proxy')).default as unknown as ProxyHandler
})

const SESSION = { user: { id: 'u1', email: 'demo@expense.io', role: 'employee' } }

function visit(pathname: string, auth: unknown) {
  return proxy({ nextUrl: new URL(pathname, 'http://localhost:3000'), auth })
}

describe('pages protégées', () => {
  for (const pathname of ['/expenses', '/manager', '/hr', '/expenses/detail', '/hr/organigramme']) {
    it(`${pathname} sans session → redirection vers /login`, () => {
      const response = visit(pathname, null)
      expect(response).toBeInstanceOf(Response)
      expect([302, 303, 307, 308]).toContain(response!.status)
      expect(new URL(response!.headers.get('location')!).pathname).toBe('/login')
    })

    it(`${pathname} avec session → laissé passer`, () => {
      const response = visit(pathname, SESSION)
      expect(response?.headers.get('location') ?? null).toBeNull()
    })
  }
})

describe('pages publiques', () => {
  for (const pathname of ['/', '/login', '/signup']) {
    it(`${pathname} sans session → laissé passer`, () => {
      const response = visit(pathname, null)
      expect(response?.headers.get('location') ?? null).toBeNull()
    })
  }
})
