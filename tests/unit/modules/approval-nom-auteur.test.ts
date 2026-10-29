import { describe, expect, it, vi } from 'vitest'
import { ExpenseNote } from '@/domain/ExpenseNote'
import { makeListApprovalQueue } from '@/modules/approval/application/listApprovalQueue'
import type { ApprovalQueue } from '@/modules/approval/ports/ApprovalQueue'
import type { Actor } from '@/modules/shared/domain'
import { presentPendingNote } from '@/modules/shared/http/presenters'

/**
 * D20, MET-08 (M-06) : la file d'un valideur porte le nom de l'auteur de chaque
 * note, pour que le manager voie un nom et non un identifiant tronqué. Port
 * simulé ; la requête elle-même est couverte par tests/defects/metier-d20.spec.ts.
 */

const NOTE = new ExpenseNote({
  id: 'note-1',
  userId: 'emp-1',
  amount: 42.5,
  expenseDate: '2026-03-12',
  description: 'Taxi',
  receiptKey: 'receipts/abc.png',
  status: 'pending',
  createdAt: '2026-03-12T10:00:00.000Z',
})

describe('listApprovalQueue (D20, MET-08)', () => {
  it('manager : la file de ses rattachés directs, avec le nom des auteurs', async () => {
    const queue: ApprovalQueue = { listPending: vi.fn(async () => [{ note: NOTE, authorName: 'Alice Martin' }]) }
    const manager: Actor = { id: 'mgr-1', role: 'manager' }

    const pending = await makeListApprovalQueue({ queue })(manager)

    expect(queue.listPending).toHaveBeenCalledWith('mgr-1', { kind: 'direct-reports', managerId: 'mgr-1' })
    expect(pending).toEqual([{ note: NOTE, authorName: 'Alice Martin' }])
  })

  it('employé : file vide, sans lecture', async () => {
    const queue: ApprovalQueue = { listPending: vi.fn() }

    expect(await makeListApprovalQueue({ queue })({ id: 'emp-1', role: 'employee' })).toEqual([])
    expect(queue.listPending).not.toHaveBeenCalled()
  })
})

describe('presentPendingNote (contrat de GET /api/manager/expense-notes)', () => {
  it('la note telle que décrite par le contrat, plus le nom de son auteur', () => {
    expect(presentPendingNote({ note: NOTE, authorName: 'Alice Martin' })).toEqual({
      id: 'note-1',
      userId: 'emp-1',
      amount: 42.5,
      expenseDate: '2026-03-12',
      description: 'Taxi',
      receiptKey: 'receipts/abc.png',
      status: 'pending',
      createdAt: '2026-03-12T10:00:00.000Z',
      authorName: 'Alice Martin',
    })
  })
})
