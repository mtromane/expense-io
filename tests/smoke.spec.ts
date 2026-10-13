import { expect, test } from '@playwright/test'

test('l’application répond sur /login', { tag: '@parity' }, async ({ request }) => {
  const res = await request.get('/login')
  expect(res.status()).toBe(200)
})
