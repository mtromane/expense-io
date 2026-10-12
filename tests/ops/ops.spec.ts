import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { SEED } from '../support/actors'
import { apiLogin } from '../support/auth'
import type { ExpenseNoteDto } from '../support/notes'

test.describe.configure({ mode: 'serial' })

test.describe('OPS — contraintes d’exploitation', { tag: '@parity' }, () => {
  test('OPS-01 scripts npm, cibles make et variables d’environnement attendus', () => {
    const scripts = Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts)
    for (const name of ['dev', 'build', 'start', 'lint', 'typecheck', 'migrate:up', 'migrate:down', 'ensure-bucket', 'seed']) {
      expect(scripts).toContain(name)
    }
    const makefile = readFileSync('Makefile', 'utf8')
    for (const target of ['install', 'env', 'up', 'down', 'migrate', 'ensure-bucket', 'seed', 'dev', 'build', 'start', 'lint', 'typecheck', 'clean']) {
      expect(makefile).toMatch(new RegExp(`^${target}:`, 'm'))
    }
    const envExample = readFileSync('.env.example', 'utf8')
    for (const name of ['DATABASE_URL', 'AUTH_SECRET', 'S3_ENDPOINT', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET', 'S3_FORCE_PATH_STYLE']) {
      expect(envExample).toMatch(new RegExp(`^#?\\s*${name}=`, 'm'))
    }
  })

  test('OPS-02 seed relancé deux fois : aucun doublon', async () => {
    test.setTimeout(120_000)
    execFileSync('npm', ['run', 'seed'], { stdio: 'inherit' })
    execFileSync('npm', ['run', 'seed'], { stdio: 'inherit' })

    const manager = await apiLogin(SEED.manager)
    const managerPending = (await (await manager.get('/api/manager/expense-notes')).json()) as ExpenseNoteDto[]
    expect(managerPending.filter((n) => n.description === 'Taxi aéroport (seed)')).toHaveLength(1)

    const hr = await apiLogin(SEED.hr)
    const hrPending = (await (await hr.get('/api/hr/expense-notes')).json()) as ExpenseNoteDto[]
    expect(hrPending.filter((n) => n.description === 'Café client (seed)')).toHaveLength(1)
    const users = (await (await hr.get('/api/hr/users')).json()) as { email: string }[]
    expect(users.filter((u) => u.email === SEED.employee.email)).toHaveLength(1)
    await Promise.all([manager.dispose(), hr.dispose()])
  })

  test('OPS-02 overrides SEED_* respectés', async () => {
    test.setTimeout(120_000)
    const domain = `ops-${randomUUID().slice(0, 8)}.test`
    execFileSync('npm', ['run', 'seed'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        SEED_HR_EMAIL: `hr@${domain}`,
        SEED_MANAGER_EMAIL: `manager@${domain}`,
        SEED_EMPLOYEE_EMAIL: `employee@${domain}`,
      },
    })
    const hr = await apiLogin({ email: `hr@${domain}`, password: SEED.hr.password })
    const emails = ((await (await hr.get('/api/hr/users')).json()) as { email: string }[]).map((u) => u.email)
    expect(emails).toEqual(expect.arrayContaining([`manager@${domain}`, `employee@${domain}`]))
    await hr.dispose()
  })
})
