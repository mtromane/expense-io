import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { actor } from '../support/actors'
import { credentialsOf, loginAs } from '../support/auth'
import { paddedPng, receipt } from '../support/files'
import { apiError } from '../support/messages'
import { createNote, listOwnNotes, postNote, type ExpenseNoteDto } from '../support/notes'
import { loginUI, signupUI } from '../support/ui'
import { expectDefect } from './registry'

/**
 * Défauts métier tranchés le 2026-10-26 (docs/audit/21-decisions-architecture.md,
 * D12 à D19 ; ADR-012 à ADR-019). Les cellules 401 / 403 de D12 et les routes
 * nouvelles sont aussi couvertes par la matrice (tests/api/authz-matrix.ts).
 *
 * Chaque test a ses propres acteurs (entreprise C du dataset), remis à zéro par
 * seed-e2e : les tests de ce fichier tournent en parallèle sans se gêner.
 * expectDefect() est appelé après la mise en place : un échec de setup reste un
 * vrai échec. Les tests qui modifient l'organigramme le restaurent, pour que
 * le job baseline-proof (où le défaut est présent) ne laisse rien derrière lui.
 */

type CompanyUser = { id: string; role: string; managerId: string | null }

function euros(amount: number): RegExp {
  const text = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\s\u00a0\u202f]/g, '[\\s\\u00a0\\u202f]'))
}

test('MET-01 inscription sur un domaine de messagerie public → refusée avec un message explicite',
  { tag: ['@defect', '@MET-01'] }, async ({ page }) => {
    for (const domain of ['gmail.com', 'outlook.fr']) {
      await signupUI(page, { name: 'Public', email: `met01-${randomUUID().slice(0, 8)}@${domain}`, password: 'motdepasse1' })
      expectDefect('MET-01')
      await expect(page.getByRole('alert').filter({ hasText: 'adresses de messagerie personnelles' })).toBeVisible()
      await expect(page).toHaveURL(/\/signup$/)
    }
  })

test('MET-03 la RH rattachée à un manager : ce manager valide ses notes, jamais la RH elle-même',
  { tag: ['@defect', '@MET-03'] }, async () => {
    const hr = await loginAs('hrC')
    const mgr = await loginAs('mgrC')
    const hrId = actor('hrC').id
    expectDefect('MET-03')

    const me = await hr.get('/api/hr/me')
    expect(me.status()).toBe(200)
    expect(await me.json()).toMatchObject({ id: hrId, role: 'hr_admin' })

    const other = await hr.put(`/api/hr/users/${hrId}/manager`, { data: { managerId: actor('rootMgrB').id } })
    expect(other.status()).toBe(409)

    const put = await hr.put(`/api/hr/users/${hrId}/manager`, { data: { managerId: actor('mgrC').id } })
    expect(put.status()).toBe(200)
    expect(await put.json()).toMatchObject({ id: hrId, role: 'hr_admin', managerId: actor('mgrC').id })

    const note = await createNote(hr)
    const hrQueue = (await (await hr.get('/api/hr/expense-notes')).json()) as ExpenseNoteDto[]
    expect(hrQueue.map((n) => n.id)).not.toContain(note.id)
    expect((await hr.post(`/api/hr/expense-notes/${note.id}/approve`)).status()).toBe(404)

    const mgrQueue = (await (await mgr.get('/api/manager/expense-notes')).json()) as ExpenseNoteDto[]
    expect(mgrQueue.map((n) => n.id)).toContain(note.id)
    expect((await mgr.post(`/api/manager/expense-notes/${note.id}/approve`)).status()).toBe(200)
    expect((await listOwnNotes(hr)).find((n) => n.id === note.id)?.status).toBe('approved')
    await Promise.all([hr.dispose(), mgr.dispose()])
  })

test('MET-03 la RH choisit son manager depuis la console RH',
  { tag: ['@defect', '@MET-03'] }, async ({ page }) => {
    await loginUI(page, credentialsOf(actor('hrC')))
    await page.goto('/hr')
    expectDefect('MET-03')
    const select = page.getByRole('combobox', { name: 'Manager qui valide mes notes de frais' })
    await expect(select).toBeVisible({ timeout: 5_000 }) // absent : échec attendu, pas un dépassement de délai
    const saved = page.waitForResponse((r) => r.request().method() === 'PUT' && r.url().includes('/manager'))
    await select.selectOption({ label: 'Manager C' })
    expect((await saved).status()).toBe(200)
    await page.reload()
    await expect(page.getByRole('combobox', { name: 'Manager qui valide mes notes de frais' })).toHaveValue(actor('mgrC').id)
  })

test('MET-04 rattachement qui crée un cycle hiérarchique → 409 Invalid manager',
  { tag: ['@defect', '@MET-04'] }, async () => {
    const hr = await loginAs('hrC')
    // mgrC2 est rattaché à mgrC : rattacher mgrC à mgrC2 fermerait la boucle.
    const url = `/api/hr/users/${actor('mgrC').id}/manager`
    expectDefect('MET-04')
    const res = await hr.put(url, { data: { managerId: actor('mgrC2').id } })
    try {
      expect(res.status()).toBe(409)
      expect(await res.json()).toEqual({ error: 'Invalid manager' })
    } finally {
      if (res.status() === 200) await hr.put(url, { data: { managerId: null } })
      await hr.dispose()
    }
  })

test('ROLE-01 la RH nomme un manager puis le rétrograde ; rôle invalide ou hors entreprise refusé',
  { tag: ['@defect', '@ROLE-01'] }, async () => {
    const hr = await loginAs('hrC')
    const target = actor('promoteC')
    const url = `/api/hr/users/${target.id}/role`
    expectDefect('ROLE-01')

    const up = await hr.put(url, { data: { role: 'manager' } })
    expect(up.status()).toBe(200)
    expect(await up.json()).toMatchObject({ id: target.id, role: 'manager' })
    const users = (await (await hr.get('/api/hr/users')).json()) as CompanyUser[]
    expect(users.find((u) => u.id === target.id)?.role).toBe('manager')

    const down = await hr.put(url, { data: { role: 'employee' } })
    expect(down.status()).toBe(200)
    expect(await down.json()).toMatchObject({ id: target.id, role: 'employee' })

    // hr_admin est attribuable depuis la réunion du 28/10 (ROLE-04) : plus un rôle invalide.
    for (const data of [{ role: 'boss' }, {}]) {
      const invalid = await hr.put(url, { data })
      expect(invalid.status()).toBe(400)
      expect(await invalid.json()).toEqual(apiError('Champs invalides'))
    }
    expect((await hr.put(`/api/hr/users/${actor('empB').id}/role`, { data: { role: 'manager' } })).status()).toBe(404)
    await hr.dispose()
  })

test('ROLE-01 menu de rôle dans la console RH',
  { tag: ['@defect', '@ROLE-01'] }, async ({ page }) => {
    const target = actor('promoteUiC')
    await loginUI(page, credentialsOf(actor('hrC')))
    await page.goto('/hr')
    expectDefect('ROLE-01')
    // Un bouton et non un second menu : la ligne garde un seul combobox (celui du manager).
    const row = page.getByRole('row').filter({ hasText: target.email })
    const promote = row.getByRole('button', { name: 'Nommer manager' })
    await expect(promote).toBeVisible({ timeout: 5_000 }) // absent : échec attendu, pas un dépassement de délai
    await promote.click()
    await expect(row.getByRole('cell').nth(1)).toHaveText('manager')
    await expect(row.getByRole('button', { name: 'Rétrograder en employé' })).toBeVisible()
    const hr = await loginAs('hrC')
    await hr.put(`/api/hr/users/${target.id}/role`, { data: { role: 'employee' } })
    await hr.dispose()
  })

test('ROLE-02 rétrograder un manager qui a encore des subordonnés → 409',
  { tag: ['@defect', '@ROLE-02'] }, async () => {
    const hr = await loginAs('hrC')
    const url = `/api/hr/users/${actor('mgrC2').id}/role`
    expectDefect('ROLE-02')
    const res = await hr.put(url, { data: { role: 'employee' } })
    try {
      expect(res.status()).toBe(409)
      expect(await res.json()).toEqual({ error: 'Manager has direct reports' })
    } finally {
      if (res.status() === 200) await hr.put(url, { data: { role: 'manager' } })
      await hr.dispose()
    }
  })

test('MET-02 note d’un employé sans manager : validée par la RH de son entreprise',
  { tag: ['@defect', '@MET-02'] }, async () => {
    const emp = await loginAs('noMgrEmpC')
    const hr = await loginAs('hrC')
    const note = await createNote(emp)
    expectDefect('MET-02')
    const queue = (await (await hr.get('/api/hr/expense-notes')).json()) as ExpenseNoteDto[]
    expect(queue.map((n) => n.id)).toContain(note.id)
    expect((await hr.post(`/api/hr/expense-notes/${note.id}/approve`)).status()).toBe(200)
    expect((await listOwnNotes(emp)).find((n) => n.id === note.id)?.status).toBe('approved')
    await Promise.all([emp.dispose(), hr.dispose()])
  })

test('MET-02 manager racine rétrogradé : ses notes passent à la RH, aucune ne reste sans valideur',
  { tag: ['@defect', '@MET-02'] }, async () => {
    const hr = await loginAs('hrC')
    const target = await loginAs('rootMgrC')
    const url = `/api/hr/users/${actor('rootMgrC').id}/role`
    expectDefect('MET-02')
    try {
      expect((await hr.put(url, { data: { role: 'employee' } })).status()).toBe(200)
      const note = await createNote(target)
      const queue = (await (await hr.get('/api/hr/expense-notes')).json()) as ExpenseNoteDto[]
      expect(queue.map((n) => n.id)).toContain(note.id)
    } finally {
      await hr.put(url, { data: { role: 'manager' } })
      await Promise.all([hr.dispose(), target.dispose()])
    }
  })

// Concurrence (revue de la PR #6) : deux changements d'organigramme simultanés
// ne doivent jamais aboutir tous les deux quand l'un invalide l'autre.
const RACE_ROUNDS = 10

test('ROLE-02 rétrogradation et rattachement simultanés : une seule des deux opérations aboutit',
  { tag: ['@defect', '@ROLE-02'] }, async () => {
    const hr = await loginAs('hrC')
    const mgr = actor('raceMgrC')
    const roleUrl = `/api/hr/users/${mgr.id}/role`
    const managerUrl = `/api/hr/users/${actor('raceEmpC').id}/manager`
    const reset = async () => {
      await hr.put(managerUrl, { data: { managerId: null } })
      await hr.put(roleUrl, { data: { role: 'manager' } })
    }
    expectDefect('ROLE-02')
    try {
      for (let round = 0; round < RACE_ROUNDS; round++) {
        const [demote, attach] = await Promise.all([
          hr.put(roleUrl, { data: { role: 'employee' } }),
          hr.put(managerUrl, { data: { managerId: mgr.id } }),
        ])
        // Rattaché d'abord → rétrogradation refusée ; rétrogradé d'abord → rattachement refusé.
        expect([demote.status(), attach.status()].sort()).toEqual([200, 409])
        const users = (await (await hr.get('/api/hr/users')).json()) as CompanyUser[]
        const orphaned = users.some((u) => u.managerId === mgr.id) && users.find((u) => u.id === mgr.id)?.role !== 'manager'
        expect(orphaned).toBe(false)
        await reset()
      }
    } finally {
      await reset()
      await hr.dispose()
    }
  })

test('MET-04 deux rattachements simultanés qui formeraient un cycle : un seul aboutit',
  { tag: ['@defect', '@MET-04'] }, async () => {
    const hr = await loginAs('hrC')
    const [first, second] = [actor('cycleMgrC1').id, actor('cycleMgrC2').id]
    const reset = () =>
      Promise.all([first, second].map((id) => hr.put(`/api/hr/users/${id}/manager`, { data: { managerId: null } })))
    expectDefect('MET-04')
    try {
      for (let round = 0; round < RACE_ROUNDS; round++) {
        const results = await Promise.all([
          hr.put(`/api/hr/users/${first}/manager`, { data: { managerId: second } }),
          hr.put(`/api/hr/users/${second}/manager`, { data: { managerId: first } }),
        ])
        expect(results.map((r) => r.status()).sort()).toEqual([200, 409])
        await reset()
      }
    } finally {
      await reset()
      await hr.dispose()
    }
  })

test('ROLE-03 un changement de rôle prend effet sans reconnexion',
  { tag: ['@defect', '@ROLE-03'] }, async () => {
    const hr = await loginAs('hrC')
    const user = await loginAs('sessionC') // session ouverte en tant qu'employé
    const url = `/api/hr/users/${actor('sessionC').id}/role`
    expect((await user.get('/api/manager/expense-notes')).status()).not.toBe(200)
    expectDefect('ROLE-03')
    try {
      expect((await hr.put(url, { data: { role: 'manager' } })).status()).toBe(200)
      expect((await user.get('/api/manager/expense-notes')).status()).toBe(200)
      expect((await hr.put(url, { data: { role: 'employee' } })).status()).toBe(200)
      expect((await user.get('/api/manager/expense-notes')).status()).toBe(403)
    } finally {
      await hr.put(url, { data: { role: 'employee' } })
      await Promise.all([hr.dispose(), user.dispose()])
    }
  })

test('API-01 messages d’erreur de l’API en anglais',
  { tag: ['@defect', '@API-01'] }, async () => {
    test.setTimeout(120_000)
    const emp = await loginAs('empA1')
    expectDefect('API-01')
    const invalid = await postNote(emp, { amount: '0' })
    expect(await invalid.json()).toEqual({ error: 'Invalid fields' })
    const gif = await postNote(emp, { receipt: receipt('gif') })
    expect(await gif.json()).toEqual({ error: 'Receipt file type not allowed' })
    const big = await postNote(emp, { receipt: paddedPng(10 * 1024 * 1024 + 1) })
    expect(await big.json()).toEqual({ error: 'File too large' })
    const notAFile = await emp.post('/api/expense-notes/receipt-suggestion', { multipart: { receipt: 'pas un fichier' } })
    expect(await notAFile.json()).toEqual({ error: 'Invalid fields' })
    await emp.dispose()
  })

test('UI-01 « Mes notes » affiche le total par statut',
  { tag: ['@defect', '@UI-01'] }, async ({ page }) => {
    const emp = await loginAs('totalsC')
    const mgr = await loginAs('mgrC')
    const [approved, rejected] = [await createNote(emp, { amount: '10.00' }), await createNote(emp, { amount: '20.00' })]
    await createNote(emp, { amount: '40.00' })
    expect((await mgr.post(`/api/manager/expense-notes/${approved.id}/approve`)).status()).toBe(200)
    expect((await mgr.post(`/api/manager/expense-notes/${rejected.id}/reject`)).status()).toBe(200)
    const notes = await listOwnNotes(emp)
    const total = (status: ExpenseNoteDto['status']) =>
      notes.filter((n) => n.status === status).reduce((sum, n) => sum + n.amount, 0)
    await Promise.all([emp.dispose(), mgr.dispose()])

    await loginUI(page, credentialsOf(actor('totalsC')))
    expectDefect('UI-01')
    await expect(page.getByText(new RegExp(
      `En attente : ${euros(total('pending')).source} · Approuvées : ${euros(total('approved')).source} · Rejetées : ${euros(total('rejected')).source}`
    ))).toBeVisible()
  })

for (const [path, title] of [['/hr', 'Accès réservé aux RH'], ['/manager', 'Accès réservé aux managers']]) {
  test(`AUTHZ-03 employé sur ${path} → même page « ${title} », statut 403`,
    { tag: ['@defect', '@AUTHZ-03'] }, async () => {
      const emp = await loginAs('empA1')
      expectDefect('AUTHZ-03')
      const res = await emp.get(path)
      expect(res.status()).toBe(403)
      expect(await res.text()).toContain(title)
      await emp.dispose()
    })
}

// ---------------------------------------------------------------------------
// Réunion d'équipe du 2026-10-28 : D13 et D14 complétées, une RH peut en nommer
// une autre (entreprises D et E du dataset, dédiées à ces tests).

type HrAdmin = { id: string; role: string; managerId: string | null }

test('ROLE-04 la RH nomme une seconde RH ; promotion effective sans reconnexion ; annuaire inchangé',
  { tag: ['@defect', '@ROLE-04'] }, async () => {
    const hr = await loginAs('hrD')
    const target = actor('promoteHrD')
    const promoted = await loginAs('promoteHrD') // session ouverte en tant qu'employé
    const url = `/api/hr/users/${target.id}/role`
    expectDefect('ROLE-04')
    try {
      const up = await hr.put(url, { data: { role: 'hr_admin' } })
      expect(up.status()).toBe(200)
      expect(await up.json()).toMatchObject({ id: target.id, role: 'hr_admin' })

      const admins = (await (await hr.get('/api/hr/admins')).json()) as HrAdmin[]
      expect(admins.map((a) => a.id)).toEqual(expect.arrayContaining([actor('hrD').id, target.id]))
      const directory = (await (await hr.get('/api/hr/users')).json()) as { id: string }[]
      expect(directory.map((u) => u.id)).not.toContain(target.id) // l'annuaire ne liste toujours que employés et managers

      expect((await promoted.get('/api/hr/admins')).status()).toBe(200) // sans reconnexion

      const down = await hr.put(url, { data: { role: 'employee' } })
      expect(down.status()).toBe(200)
      expect((await promoted.get('/api/hr/admins')).status()).toBe(403)
    } finally {
      await hr.put(url, { data: { role: 'employee' } })
      await Promise.all([hr.dispose(), promoted.dispose()])
    }
  })

test('ROLE-04 bouton « Nommer RH » et section « Équipe RH » dans la console',
  { tag: ['@defect', '@ROLE-04'] }, async ({ page }) => {
    const target = actor('promoteHrUiD')
    await loginUI(page, credentialsOf(actor('hrD')))
    await page.goto('/hr')
    expectDefect('ROLE-04')
    const row = page.getByRole('row').filter({ hasText: target.email })
    const promote = row.getByRole('button', { name: 'Nommer RH' })
    await expect(promote).toBeVisible({ timeout: 5_000 }) // absent : échec attendu, pas un dépassement de délai
    await promote.click()
    const team = page.getByRole('region', { name: 'Équipe RH' })
    await expect(team.getByText(target.email)).toBeVisible()
    await expect(page.getByRole('row').filter({ hasText: target.email }).getByRole('button', { name: 'Nommer RH' })).toHaveCount(0)
    const hr = await loginAs('hrD')
    await hr.put(`/api/hr/users/${target.id}/role`, { data: { role: 'employee' } })
    await hr.dispose()
  })

test('ROLE-05 une RH ne change jamais son propre rôle → 409 Cannot change own role',
  { tag: ['@defect', '@ROLE-05'] }, async () => {
    const self = await loginAs('hrD2')
    const url = `/api/hr/users/${actor('hrD2').id}/role`
    expectDefect('ROLE-05')
    const res = await self.put(url, { data: { role: 'employee' } })
    try {
      expect(res.status()).toBe(409)
      expect(await res.json()).toEqual({ error: 'Cannot change own role' })
    } finally {
      if (res.status() === 200) {
        const hr = await loginAs('hrD')
        await hr.put(url, { data: { role: 'hr_admin' } })
        await hr.dispose()
      }
      await self.dispose()
    }
  })

test('ROLE-06 deux RH qui se rétrogradent en même temps : il reste toujours une RH',
  { tag: ['@defect', '@ROLE-06'] }, async () => {
    const [e1, e2] = [actor('hrE1'), actor('hrE2')]
    const [ctx1, ctx2] = await Promise.all([loginAs('hrE1'), loginAs('hrE2')])
    const restore = async () => {
      // La RH restante repromeut l'autre ; sans effet si les deux sont encore RH.
      for (const [ctx, other] of [[ctx1, e2], [ctx2, e1]] as const) {
        await ctx.put(`/api/hr/users/${other.id}/role`, { data: { role: 'hr_admin' } })
      }
    }
    expectDefect('ROLE-06')
    try {
      for (let round = 0; round < RACE_ROUNDS; round++) {
        const [r1, r2] = await Promise.all([
          ctx1.put(`/api/hr/users/${e2.id}/role`, { data: { role: 'employee' } }),
          ctx2.put(`/api/hr/users/${e1.id}/role`, { data: { role: 'employee' } }),
        ])
        const statuses = [r1.status(), r2.status()].sort()
        // Une seule rétrogradation aboutit. L'autre est refusée : 409 « Last HR admin » si elle
        // passe la garde avant l'autre écriture, 403 si son auteur n'est déjà plus RH.
        expect(statuses[0], statuses.join(',')).toBe(200)
        expect([403, 409], statuses.join(',')).toContain(statuses[1])
        const refused = r1.status() === 200 ? r2 : r1
        if (refused.status() === 409) expect(await refused.json()).toEqual({ error: 'Last HR admin' })
        const survivor = r1.status() === 200 ? ctx1 : ctx2
        const admins = (await (await survivor.get('/api/hr/admins')).json()) as HrAdmin[]
        expect(admins).toHaveLength(1)
        await restore()
      }
    } finally {
      await restore()
      await Promise.all([ctx1.dispose(), ctx2.dispose()])
    }
  })

test('ROLE-07 promouvoir en RH un manager qui a encore des subordonnés → 409 Manager has direct reports',
  { tag: ['@defect', '@ROLE-07'] }, async () => {
    const hr = await loginAs('hrD')
    const url = `/api/hr/users/${actor('mgrReportsD').id}/role`
    expectDefect('ROLE-07')
    const res = await hr.put(url, { data: { role: 'hr_admin' } })
    try {
      expect(res.status()).toBe(409)
      expect(await res.json()).toEqual({ error: 'Manager has direct reports' })
    } finally {
      if (res.status() === 200) await hr.put(url, { data: { role: 'manager' } })
      await hr.dispose()
    }
  })

test('MET-10 note d’une RH sans manager : validée par une autre RH, jamais par elle-même',
  { tag: ['@defect', '@MET-10'] }, async () => {
    const author = await loginAs('hrD2')
    const other = await loginAs('hrD')
    const note = await createNote(author)
    expectDefect('MET-10')
    const ownQueue = (await (await author.get('/api/hr/expense-notes')).json()) as ExpenseNoteDto[]
    expect(ownQueue.map((n) => n.id)).not.toContain(note.id)
    expect((await author.post(`/api/hr/expense-notes/${note.id}/approve`)).status()).toBe(404)
    const queue = (await (await other.get('/api/hr/expense-notes')).json()) as ExpenseNoteDto[]
    expect(queue.map((n) => n.id)).toContain(note.id)
    expect((await other.post(`/api/hr/expense-notes/${note.id}/approve`)).status()).toBe(200)
    expect((await listOwnNotes(author)).find((n) => n.id === note.id)?.status).toBe('approved')
    await Promise.all([author.dispose(), other.dispose()])
  })
