import { execFileSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { actor } from '../support/actors'
import { apiLogin, credentialsOf } from '../support/auth'

test.describe.configure({ mode: 'serial' })

test.describe('seed-e2e', { tag: '@parity' }, () => {
  test('les acteurs du dataset peuvent se connecter', async () => {
    for (const key of ['hrA', 'subMgrA', 'empA1', 'hrB'] as const) {
      const ctx = await apiLogin(credentialsOf(actor(key)))
      expect((await ctx.get('/api/expense-notes')).status()).toBe(200)
      await ctx.dispose()
    }
  })

  test('seed-e2e restaure la hiérarchie du dataset', async () => {
    const hr = await apiLogin(credentialsOf(actor('hrA')))
    const target = actor('reassignSeed')
    const put = await hr.put(`/api/hr/users/${target.id}/manager`, {
      data: { managerId: actor('rootMgrA').id },
    })
    expect(put.status()).toBe(200)

    execFileSync('node', ['scripts/seed-e2e.mjs'], { stdio: 'inherit' })

    const users = (await (await hr.get('/api/hr/users')).json()) as { id: string; managerId: string | null }[]
    expect(users.find((u) => u.id === target.id)?.managerId).toBeNull()
    await hr.dispose()
  })
})
