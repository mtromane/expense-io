import { expect, request, test } from '@playwright/test'
import { SEED } from '../support/actors'
import { apiLogin } from '../support/auth'
import { BASE_URL } from '../support/env'

test.describe('AUTH — connexion via Auth.js', { tag: '@parity' }, () => {
  for (const [role, creds] of Object.entries(SEED)) {
    test(`compte seed ${role} : session valide`, async () => {
      const ctx = await apiLogin(creds)
      expect((await ctx.get('/api/expense-notes')).status()).toBe(200)
      await ctx.dispose()
    })
  }

  test('mauvais mot de passe : aucune session, redirection avec erreur', async () => {
    const ctx = await request.newContext({ baseURL: BASE_URL })
    const { csrfToken } = (await (await ctx.get('/api/auth/csrf')).json()) as { csrfToken: string }
    const res = await ctx.post('/api/auth/callback/credentials', {
      form: {
        email: SEED.employee.email,
        password: 'mauvais-mot-de-passe',
        csrfToken,
        callbackUrl: `${BASE_URL}/expenses`,
      },
      maxRedirects: 0,
    })
    expect([302, 303]).toContain(res.status())
    expect(res.headers()['location']).toContain('error=CredentialsSignin')
    const { cookies } = await ctx.storageState()
    expect(cookies.some((c) => c.name.endsWith('authjs.session-token'))).toBe(false)
    expect((await ctx.get('/api/expense-notes')).status()).toBe(401)
    await ctx.dispose()
  })
})
