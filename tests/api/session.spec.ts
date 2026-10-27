import { expect, request, test } from '@playwright/test'
import { SEED } from '../support/actors'
import { apiLogin } from '../support/auth'
import { BASE_URL } from '../support/env'

// Session Auth.js : contenu exposé au navigateur, cookie, déconnexion. Les
// pages s'appuient sur `role` (liens Manager / RH, gardes) : une session sans
// rôle casserait l'interface sans faire échouer l'API.

interface SessionDto {
  user: { id: string; email: string; role: string }
  expires: string
}

test.describe('SESSION — contenu et cycle de vie', { tag: '@parity' }, () => {
  const roles = [
    { creds: SEED.employee, role: 'employee' },
    { creds: SEED.manager, role: 'manager' },
    { creds: SEED.hr, role: 'hr_admin' },
  ]
  for (const { creds, role } of roles) {
    test(`${role} : la session expose id, email et rôle, jamais le mot de passe`, async () => {
      const ctx = await apiLogin(creds)
      const res = await ctx.get('/api/auth/session')
      expect(res.status()).toBe(200)
      const raw = await res.text()
      const session = JSON.parse(raw) as SessionDto
      expect(session.user).toMatchObject({ email: creds.email, role })
      expect(session.user.id).toMatch(/^[0-9a-f-]{36}$/)
      expect(new Date(session.expires).getTime()).toBeGreaterThan(Date.now())
      expect(raw).not.toMatch(/password|\$2[aby]\$/i)
      await ctx.dispose()
    })
  }

  test('anonyme : aucune session', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL })
    const res = await ctx.get('/api/auth/session')
    expect(res.status()).toBe(200)
    expect(await res.json()).toBeNull()
    await ctx.dispose()
  })

  test('cookie de session HttpOnly et SameSite=Lax', async () => {
    const ctx = await apiLogin(SEED.employee)
    const cookie = (await ctx.storageState()).cookies.find((c) => c.name.endsWith('authjs.session-token'))
    expect(cookie).toBeDefined()
    expect(cookie!.httpOnly).toBe(true)
    expect(cookie!.sameSite).toBe('Lax')
    await ctx.dispose()
  })

  test('déconnexion : la session disparaît et l’API refuse l’accès', async () => {
    const ctx = await apiLogin(SEED.employee)
    expect((await ctx.get('/api/expense-notes')).status()).toBe(200)
    const { csrfToken } = (await (await ctx.get('/api/auth/csrf')).json()) as { csrfToken: string }
    const res = await ctx.post('/api/auth/signout', {
      form: { csrfToken, callbackUrl: `${BASE_URL}/login` },
      maxRedirects: 0,
    })
    expect([302, 303]).toContain(res.status())
    expect(await (await ctx.get('/api/auth/session')).json()).toBeNull()
    expect((await ctx.get('/api/expense-notes')).status()).toBe(401)
    await ctx.dispose()
  })
})
