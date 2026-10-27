import { describe, expect, it } from 'vitest'
import { ExpenseNote, type ExpenseNoteProps, type ExpenseNoteStatus } from '@/domain/ExpenseNote'
import { User, type UserProps } from '@/domain/User'

/**
 * Règles métier du domaine (src/domain/). Ce code n'est pas encore branché
 * sur les routes (elles portent la même logique en SQL) : ces tests fixent
 * les règles que le nouveau domaine doit respecter, les mêmes que celles
 * vérifiées en boîte noire par tests/api/manager.spec.ts et hr.spec.ts.
 */

function note(status: ExpenseNoteStatus): ExpenseNote {
  const props: ExpenseNoteProps = {
    id: 'note-1',
    userId: 'emp-1',
    amount: 42.5,
    expenseDate: '2026-03-12',
    description: 'Taxi aéroport',
    receiptKey: 'receipts/1.png',
    status,
  }
  return new ExpenseNote(props)
}

function user(props: Partial<UserProps> & Pick<UserProps, 'id' | 'role'>): User {
  return new User({ email: `${props.id}@a.test`, name: props.id, managerId: null, ...props })
}

describe('ExpenseNote — décision', () => {
  it('une note en attente peut être tranchée', () => {
    expect(note('pending').canBeDecided()).toBe(true)
  })

  it('approve → approuvée, sans modifier la note d’origine', () => {
    const pending = note('pending')
    const approved = pending.approve()
    expect(approved.status).toBe('approved')
    expect(pending.status).toBe('pending')
    expect(approved.toJSON()).toEqual({ ...pending.toJSON(), status: 'approved' })
  })

  it('reject → rejetée, sans modifier la note d’origine', () => {
    const pending = note('pending')
    const rejected = pending.reject()
    expect(rejected.status).toBe('rejected')
    expect(pending.status).toBe('pending')
    expect(rejected.id).toBe(pending.id)
  })

  for (const status of ['approved', 'rejected'] as const) {
    it(`note ${status} : plus de décision possible`, () => {
      const decided = note(status)
      expect(decided.canBeDecided()).toBe(false)
      expect(() => decided.approve()).toThrow('Cette note a déjà été tranchée.')
      expect(() => decided.reject()).toThrow('Cette note a déjà été tranchée.')
    })
  }

  it('toJSON renvoie une copie : la modifier n’altère pas la note', () => {
    const pending = note('pending')
    const json = pending.toJSON()
    json.status = 'approved'
    expect(pending.status).toBe('pending')
  })
})

describe('User — hiérarchie', () => {
  const root = user({ id: 'root', role: 'manager' })
  const sub = user({ id: 'sub', role: 'manager', managerId: 'root' })
  const emp = user({ id: 'emp', role: 'employee', managerId: 'sub' })

  it('manager sans manager = manager racine (ses notes vont à la RH)', () => {
    expect(root.isRootManager()).toBe(true)
  })

  it('manager rattaché, employé ou RH : pas manager racine', () => {
    expect(sub.isRootManager()).toBe(false)
    expect(user({ id: 'orphan', role: 'employee' }).isRootManager()).toBe(false)
    expect(user({ id: 'hr', role: 'hr_admin' }).isRootManager()).toBe(false)
  })

  it('un manager gère ses rattachés directs', () => {
    expect(sub.canManage(emp)).toBe(true)
    expect(root.canManage(sub)).toBe(true)
  })

  it('pas de gestion au niveau N-2', () => {
    expect(root.canManage(emp)).toBe(false)
  })

  it('un non-manager ne gère personne, même désigné comme manager', () => {
    const fakeBoss = user({ id: 'boss', role: 'employee' })
    const report = user({ id: 'report', role: 'employee', managerId: 'boss' })
    expect(fakeBoss.canManage(report)).toBe(false)
    const hr = user({ id: 'hr', role: 'hr_admin' })
    expect(hr.canManage(user({ id: 'x', role: 'employee', managerId: 'hr' }))).toBe(false)
  })

  it('un manager ne gère pas un collaborateur d’un autre manager', () => {
    const other = user({ id: 'other', role: 'manager' })
    expect(other.canManage(emp)).toBe(false)
  })
})
