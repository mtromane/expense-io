import { describe, expect, it } from 'vitest'
import { makeAssignManager } from '@/modules/organization/application/assignManager'
import type { CompanyUser } from '@/modules/organization/domain/CompanyUser'
import type { OrganizationRepository } from '@/modules/organization/ports/OrganizationRepository'
import { ConflictError, InvalidInputError, NotFoundError, type Actor } from '@/modules/shared/domain'

/**
 * Cas d'usage assignManager avec un annuaire en mémoire : bornage à
 * l'entreprise (SEC-03), corps invalide refusé sans rien modifier (ROB-03e).
 */

const HR_A: Actor = { id: 'hr-a', role: 'hr_admin' }
const EMP = '11111111-1111-4111-8111-111111111111'
const MGR_A = '22222222-2222-4222-8222-222222222222'
const MGR_B = '33333333-3333-4333-8333-333333333333'

interface Member extends CompanyUser {
  company: string
}

class InMemoryOrganization implements OrganizationRepository {
  writes = 0
  constructor(public members: Member[]) {}

  private companyOf(hrId: string) {
    return hrId === 'hr-a' ? 'A' : 'B'
  }

  async listDirectory(hrId: string) {
    return this.members.filter((m) => m.company === this.companyOf(hrId))
  }

  async findMember(hrId: string, userId: string) {
    return this.members.find((m) => m.id === userId && m.company === this.companyOf(hrId)) ?? null
  }

  async isManagerOfCompany(hrId: string, managerId: string) {
    return this.members.some((m) => m.id === managerId && m.role === 'manager' && m.company === this.companyOf(hrId))
  }

  async setManager(userId: string, managerId: string | null) {
    this.writes++
    const member = this.members.find((m) => m.id === userId)!
    member.managerId = managerId
    return member
  }
}

function organization() {
  return new InMemoryOrganization([
    { id: EMP, name: 'Emp', email: 'emp@a.test', role: 'employee', managerId: MGR_A, company: 'A' },
    { id: MGR_A, name: 'Mgr A', email: 'mgr@a.test', role: 'manager', managerId: null, company: 'A' },
    { id: MGR_B, name: 'Mgr B', email: 'mgr@b.test', role: 'manager', managerId: null, company: 'B' },
  ])
}

describe('assignManager', () => {
  it('rattache un employé à un manager de la même entreprise', async () => {
    const org = organization()
    org.members[0].managerId = null
    const user = await makeAssignManager({ organization: org })({ actor: HR_A, userId: EMP, input: { managerId: MGR_A } })
    expect(user.managerId).toBe(MGR_A)
  })

  it('managerId null ou absent → manager retiré', async () => {
    const org = organization()
    expect((await makeAssignManager({ organization: org })({ actor: HR_A, userId: EMP, input: {} })).managerId).toBeNull()
  })

  it('manager d’une autre entreprise → Invalid manager, rien n’est écrit (SEC-03)', async () => {
    const org = organization()
    await expect(
      makeAssignManager({ organization: org })({ actor: HR_A, userId: EMP, input: { managerId: MGR_B } })
    ).rejects.toEqual(new ConflictError('Invalid manager'))
    expect(org.writes).toBe(0)
  })

  it('soi-même comme manager → Invalid manager', async () => {
    await expect(
      makeAssignManager({ organization: organization() })({ actor: HR_A, userId: MGR_A, input: { managerId: MGR_A } })
    ).rejects.toEqual(new ConflictError('Invalid manager'))
  })

  for (const [name, input] of [
    ['corps illisible', undefined],
    ['tableau', []],
    ['managerId non UUID', { managerId: 'pas-un-uuid' }],
    ['managerId numérique', { managerId: 42 }],
  ] as const) {
    it(`${name} → Champs invalides, manager conservé (ROB-03e)`, async () => {
      const org = organization()
      await expect(makeAssignManager({ organization: org })({ actor: HR_A, userId: EMP, input })).rejects.toBeInstanceOf(
        InvalidInputError
      )
      expect(org.writes).toBe(0)
      expect(org.members[0].managerId).toBe(MGR_A)
    })
  }

  it('utilisateur hors entreprise → NotFound', async () => {
    await expect(
      makeAssignManager({ organization: organization() })({ actor: HR_A, userId: MGR_B, input: { managerId: null } })
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
