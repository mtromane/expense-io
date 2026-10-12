import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { expect, request, test } from '@playwright/test'
import { actor } from '../support/actors'
import { apiLogin, credentialsOf, loginAs } from '../support/auth'
import { FAULTY_URL } from '../support/env'
import { postNote, uniqueDescription } from '../support/notes'
import { expectDefect } from './registry'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    return statSync(full).isDirectory() ? sourceFiles(full) : [full]
  })
}

test('SEC-01 ?sort= hors liste blanche → 400 (les tris légitimes restent couverts par EMP)',
  { tag: ['@defect', '@SEC-01'] }, async () => {
    expectDefect('SEC-01')
    const emp = await loginAs('empA1')
    const res = await emp.get('/api/expense-notes', { params: { sort: 'colonne_inexistante' } })
    expect(res.status()).toBe(400)
    await emp.dispose()
  })

test('SEC-03 assigner un manager d’une autre entreprise → 409 Invalid manager',
  { tag: ['@defect', '@SEC-03'] }, async () => {
    expectDefect('SEC-03')
    const hr = await loginAs('hrA')
    const res = await hr.put(`/api/hr/users/${actor('reassignSec03').id}/manager`, {
      data: { managerId: actor('rootMgrB').id },
    })
    expect(res.status()).toBe(409)
    expect(await res.json()).toEqual({ error: 'Invalid manager' })
    await hr.dispose()
  })

test('SEC-04 aucun secret de session écrit en dur dans src/',
  { tag: ['@defect', '@SEC-04'] }, () => {
    expectDefect('SEC-04')
    const leaked = 'e29f9c3b6a1d4e7f8021c5b6d4a9f0e3c7b8a2d1f6e5c4b3a2918273645fabcd'
    const offenders = sourceFiles('src').filter((file) => readFileSync(file, 'utf8').includes(leaked))
    expect(offenders).toEqual([])
  })

test('SEC-04 une session émise par une instance n’est pas acceptée par une instance au secret différent',
  { tag: ['@defect', '@SEC-04'] }, async () => {
    expectDefect('SEC-04')
    const main = await loginAs('empA1')
    const { cookies } = await main.storageState()
    const faulty = await request.newContext({ baseURL: FAULTY_URL, storageState: { cookies, origins: [] } })
    const res = await faulty.get('/api/expense-notes')
    expect(res.status()).toBe(401)
    await Promise.all([main.dispose(), faulty.dispose()])
  })

test('SEC-05 une erreur serveur ne divulgue ni stack ni chemin interne',
  { tag: ['@defect', '@SEC-05'] }, async () => {
    expectDefect('SEC-05')
    test.setTimeout(60_000)
    const ctx = await apiLogin(credentialsOf(actor('empA2')), FAULTY_URL)
    const res = await postNote(ctx, { description: uniqueDescription('S3 indisponible') })
    expect(res.status()).toBeGreaterThanOrEqual(500)
    const body = await res.text()
    expect(body).not.toContain('stack')
    expect(body).not.toMatch(/at .+\.(js|ts|mjs):\d+/)
    await ctx.dispose()
  })
