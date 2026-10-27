import { describe, expect, it } from 'vitest'
import type { UserRole } from '@/domain/User'
import { makeAssignManager } from '@/modules/organization/application/assignManager'
import { makeChangeRole } from '@/modules/organization/application/changeRole'
import { makeGetHrProfile } from '@/modules/organization/application/getHrProfile'
import type { AssignableRole, CompanyUser, HrUser } from '@/modules/organization/domain/CompanyUser'
import type { OrganizationRepository, OrganizationTransaction } from '@/modules/organization/ports/OrganizationRepository'
import { ConflictError, InvalidInputError, NotFoundError, type Actor } from '@/modules/shared/domain'

/**
 * Cas d'usage de l'organigramme avec un annuaire en mémoire : bornage à
 * l'entreprise (SEC-03), corps invalide refusé sans rien modifier (ROB-03e),
 * cycle refusé (D18, MET-04), RH rattachable à un manager (D13, MET-03),
 * changement de rôle (D14, ROLE-01, ROLE-02).
 */

const HR_A: Actor = { id: '44444444-4444-4444-8444-444444444444', role: 'hr_admin' }
const EMP = '11111111-1111-4111-8111-111111111111'
const MGR_A = '22222222-2222-4222-8222-222222222222'
const MGR_B = '33333333-3333-4333-8333-333333333333'
const SUB_MGR_A = '55555555-5555-4555-8555-555555555555'

interface Member {
  id: string
  name: string
  email: string
  role: UserRole
  managerId: string | null
  company: string
}

function view(member: Member): CompanyUser | HrUser {
  const { id, name, email, role, managerId } = member
  return { id, name, email, role, managerId } as CompanyUser | HrUser
}

class InMemoryOrganization implements OrganizationRepository {
  writes = 0
  constructor(public members: Member[]) {}

  private companyOf(hrId: string) {
    return this.members.find((m) => m.id === hrId)!.company
  }

  private inDirectory(m: Member) {
    return m.role === 'employee' || m.role === 'manager'
  }

  async listDirectory(hrId: string) {
    return this.members.filter((m) => this.inDirectory(m) && m.company === this.companyOf(hrId)).map(view) as CompanyUser[]
  }

  async findMember(hrId: string, userId: string) {
    const found = this.members.find((m) => m.id === userId && this.inDirectory(m) && m.company === this.companyOf(hrId))
    return found ? (view(found) as CompanyUser) : null
  }

  async findHr(hrId: string) {
    const found = this.members.find((m) => m.id === hrId && m.role === 'hr_admin')
    return found ? (view(found) as HrUser) : null
  }

  async isManagerOfCompany(hrId: string, managerId: string) {
    return this.members.some((m) => m.id === managerId && m.role === 'manager' && m.company === this.companyOf(hrId))
  }

  async isAboveInHierarchy(userId: string, managerId: string) {
    for (let id: string | null = managerId; id !== null; id = this.members.find((m) => m.id === id)?.managerId ?? null) {
      if (id === userId) return true
    }
    return false
  }

  async hasDirectReports(managerId: string) {
    return this.members.some((m) => m.managerId === managerId)
  }

  async setManager(userId: string, managerId: string | null) {
    this.writes++
    const member = this.members.find((m) => m.id === userId)!
    member.managerId = managerId
    return view(member)
  }

  async setRole(userId: string, role: AssignableRole) {
    this.writes++
    const member = this.members.find((m) => m.id === userId)!
    member.role = role
    return view(member) as CompanyUser
  }
}

function organization() {
  return new InMemoryOrganization([
    { id: HR_A.id, name: 'RH A', email: 'rh@a.test', role: 'hr_admin', managerId: null, company: 'A' },
    { id: EMP, name: 'Emp', email: 'emp@a.test', role: 'employee', managerId: MGR_A, company: 'A' },
    { id: MGR_A, name: 'Mgr A', email: 'mgr@a.test', role: 'manager', managerId: null, company: 'A' },
    { id: SUB_MGR_A, name: 'Sous-mgr A', email: 'sub@a.test', role: 'manager', managerId: MGR_A, company: 'A' },
    { id: MGR_B, name: 'Mgr B', email: 'mgr@b.test', role: 'manager', managerId: null, company: 'B' },
  ])
}

const member = (org: InMemoryOrganization, id: string) => org.members.find((m) => m.id === id)!

/** Transaction de l'organigramme en mémoire : exécute le travail et note pour quelle RH. */
function inTransaction(org: InMemoryOrganization): OrganizationTransaction & { hrIds: string[] } {
  return {
    hrIds: [],
    run(hrId, work) {
      this.hrIds.push(hrId)
      return work(org)
    },
  }
}

describe('assignManager', () => {
  it('rattache un employé à un manager de la même entreprise', async () => {
    const org = organization()
    member(org, EMP).managerId = null
    const user = await makeAssignManager({ transaction: inTransaction(org) })({ actor: HR_A, userId: EMP, input: { managerId: MGR_A } })
    expect(user.managerId).toBe(MGR_A)
  })

  it('managerId null ou absent → manager retiré', async () => {
    const org = organization()
    expect((await makeAssignManager({ transaction: inTransaction(org) })({ actor: HR_A, userId: EMP, input: {} })).managerId).toBeNull()
  })

  it('manager d’une autre entreprise → Invalid manager, rien n’est écrit (SEC-03)', async () => {
    const org = organization()
    await expect(
      makeAssignManager({ transaction: inTransaction(org) })({ actor: HR_A, userId: EMP, input: { managerId: MGR_B } })
    ).rejects.toEqual(new ConflictError('Invalid manager'))
    expect(org.writes).toBe(0)
  })

  it('soi-même comme manager → Invalid manager', async () => {
    await expect(
      makeAssignManager({ transaction: inTransaction(organization()) })({ actor: HR_A, userId: MGR_A, input: { managerId: MGR_A } })
    ).rejects.toEqual(new ConflictError('Invalid manager'))
  })

  it('rattachement qui crée un cycle → Invalid manager, rien n’est écrit (D18, MET-04)', async () => {
    const org = organization()
    // SUB_MGR_A est rattaché à MGR_A : rattacher MGR_A à SUB_MGR_A fermerait la boucle.
    await expect(
      makeAssignManager({ transaction: inTransaction(org) })({ actor: HR_A, userId: MGR_A, input: { managerId: SUB_MGR_A } })
    ).rejects.toEqual(new ConflictError('Invalid manager'))
    expect(org.writes).toBe(0)
  })

  it('cycle plus profond refusé aussi', async () => {
    const org = organization()
    member(org, EMP).role = 'manager'
    member(org, EMP).managerId = SUB_MGR_A // MGR_A → SUB_MGR_A → EMP
    await expect(
      makeAssignManager({ transaction: inTransaction(org) })({ actor: HR_A, userId: MGR_A, input: { managerId: EMP } })
    ).rejects.toEqual(new ConflictError('Invalid manager'))
  })

  it('la RH se rattache elle-même à un manager de son entreprise (D13, MET-03)', async () => {
    const org = organization()
    const hr = await makeAssignManager({ transaction: inTransaction(org) })({ actor: HR_A, userId: HR_A.id, input: { managerId: MGR_A } })
    expect(hr).toEqual({ id: HR_A.id, name: 'RH A', email: 'rh@a.test', role: 'hr_admin', managerId: MGR_A })
  })

  it('la RH ne peut pas se rattacher à un manager d’une autre entreprise', async () => {
    await expect(
      makeAssignManager({ transaction: inTransaction(organization()) })({ actor: HR_A, userId: HR_A.id, input: { managerId: MGR_B } })
    ).rejects.toEqual(new ConflictError('Invalid manager'))
  })

  for (const [name, input] of [
    ['corps illisible', undefined],
    ['tableau', []],
    ['managerId non UUID', { managerId: 'pas-un-uuid' }],
    ['managerId numérique', { managerId: 42 }],
  ] as const) {
    it(`${name} → Invalid fields, manager conservé (ROB-03e)`, async () => {
      const org = organization()
      await expect(makeAssignManager({ transaction: inTransaction(org) })({ actor: HR_A, userId: EMP, input })).rejects.toBeInstanceOf(
        InvalidInputError
      )
      expect(org.writes).toBe(0)
      expect(member(org, EMP).managerId).toBe(MGR_A)
    })
  }

  it('utilisateur hors entreprise → NotFound', async () => {
    await expect(
      makeAssignManager({ transaction: inTransaction(organization()) })({ actor: HR_A, userId: MGR_B, input: { managerId: null } })
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('changeRole (D14)', () => {
  it('nomme un employé manager (ROLE-01)', async () => {
    const org = organization()
    member(org, EMP).managerId = null
    const user = await makeChangeRole({ transaction: inTransaction(org) })({ actor: HR_A, userId: EMP, input: { role: 'manager' } })
    expect(user).toMatchObject({ id: EMP, role: 'manager' })
  })

  it('rétrograde un manager sans subordonné', async () => {
    const org = organization()
    const user = await makeChangeRole({ transaction: inTransaction(org) })({ actor: HR_A, userId: SUB_MGR_A, input: { role: 'employee' } })
    expect(user).toMatchObject({ id: SUB_MGR_A, role: 'employee' })
  })

  it('manager qui a encore des subordonnés → 409, rien n’est écrit (ROLE-02)', async () => {
    const org = organization()
    await expect(
      makeChangeRole({ transaction: inTransaction(org) })({ actor: HR_A, userId: MGR_A, input: { role: 'employee' } })
    ).rejects.toEqual(new ConflictError('Manager has direct reports'))
    expect(org.writes).toBe(0)
  })

  it('rôle inchangé → aucune écriture', async () => {
    const org = organization()
    await makeChangeRole({ transaction: inTransaction(org) })({ actor: HR_A, userId: EMP, input: { role: 'employee' } })
    expect(org.writes).toBe(0)
  })

  for (const [name, input] of [
    ['corps illisible', undefined],
    ['rôle absent', {}],
    ['seconde RH', { role: 'hr_admin' }],
    ['rôle inconnu', { role: 'boss' }],
  ] as const) {
    it(`${name} → Invalid fields, rien n’est écrit`, async () => {
      const org = organization()
      await expect(makeChangeRole({ transaction: inTransaction(org) })({ actor: HR_A, userId: EMP, input })).rejects.toBeInstanceOf(
        InvalidInputError
      )
      expect(org.writes).toBe(0)
    })
  }

  it('utilisateur d’une autre entreprise, ou la RH elle-même → NotFound', async () => {
    for (const userId of [MGR_B, HR_A.id]) {
      await expect(
        makeChangeRole({ transaction: inTransaction(organization()) })({ actor: HR_A, userId, input: { role: 'manager' } })
      ).rejects.toBeInstanceOf(NotFoundError)
    }
  })
})

describe('transaction de l’organigramme', () => {
  it('rattachement et changement de rôle s’exécutent dans la transaction de l’entreprise de la RH', async () => {
    const org = organization()
    const transaction = inTransaction(org)
    await makeAssignManager({ transaction })({ actor: HR_A, userId: EMP, input: { managerId: null } })
    await makeChangeRole({ transaction })({ actor: HR_A, userId: EMP, input: { role: 'manager' } })
    expect(transaction.hrIds).toEqual([HR_A.id, HR_A.id])
  })
})

describe('getHrProfile (D13)', () => {
  it('fiche de la RH, avec son manager', async () => {
    const org = organization()
    member(org, HR_A.id).managerId = MGR_A
    expect(await makeGetHrProfile({ organization: org })(HR_A)).toMatchObject({ id: HR_A.id, role: 'hr_admin', managerId: MGR_A })
  })
})
