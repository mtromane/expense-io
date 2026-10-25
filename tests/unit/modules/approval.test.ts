import { describe, expect, it, vi } from 'vitest'
import { ExpenseNote, type ExpenseNoteProps } from '@/domain/ExpenseNote'
import type { ApprovalScope } from '@/modules/approval/domain/ApprovalPolicy'
import { approvalScopeOf } from '@/modules/approval/domain/ApprovalPolicy'
import { makeDecideExpenseNote } from '@/modules/approval/application/decideExpenseNote'
import { makeGetReceiptUrlForApprover } from '@/modules/approval/application/getReceiptUrlForApprover'
import { makeListPendingNotes } from '@/modules/approval/application/listPendingNotes'
import type { ApprovalRepository, ApprovalTransaction } from '@/modules/approval/ports/ApprovalRepository'
import { ConflictError, NotFoundError, type Actor } from '@/modules/shared/domain'

/**
 * Cas d'usage du module approval avec des ports simulés : aucune base, aucun
 * Next.js. Le dépôt en mémoire applique le périmètre et l'écriture
 * conditionnée au statut comme PgApprovalRepository.
 */

const MANAGER: Actor = { id: 'mgr-1', role: 'manager' }
const HR: Actor = { id: 'hr-1', role: 'hr_admin' }
const EMPLOYEE: Actor = { id: 'emp-1', role: 'employee' }

function note(props: Partial<ExpenseNoteProps> = {}): ExpenseNote {
  return new ExpenseNote({
    id: 'note-1',
    userId: 'emp-1',
    amount: 42.5,
    expenseDate: '2026-03-12',
    description: 'Taxi',
    receiptKey: 'receipts/abc.png',
    status: 'pending',
    createdAt: '2026-03-12T10:00:00.000Z',
    ...props,
  })
}

class InMemoryApprovals implements ApprovalRepository {
  /** Notes visibles par périmètre (clé : identifiant du valideur). */
  constructor(public notes: Map<string, ExpenseNote[]>, private readonly loseRace = false) {}

  private inScope(scope: ApprovalScope): ExpenseNote[] {
    return this.notes.get(scope.kind === 'direct-reports' ? scope.managerId : scope.hrId) ?? []
  }

  async listPending(scope: ApprovalScope) {
    return this.inScope(scope).filter((n) => n.status === 'pending')
  }

  async findInScope(scope: ApprovalScope, noteId: string) {
    return this.inScope(scope).find((n) => n.id === noteId) ?? null
  }

  async saveDecision(decided: ExpenseNote) {
    if (this.loseRace) return null
    for (const [owner, list] of this.notes) {
      const index = list.findIndex((n) => n.id === decided.id && n.status === 'pending')
      if (index >= 0) {
        list[index] = decided
        this.notes.set(owner, list)
        return decided
      }
    }
    return null
  }
}

function transactionOver(repo: ApprovalRepository): ApprovalTransaction & { actors: string[] } {
  const actors: string[] = []
  return { actors, run: async (actorId, work) => (actors.push(actorId), work(repo)) }
}

describe('ApprovalPolicy', () => {
  it('manager → ses rattachés directs ; RH → managers racine de son entreprise ; employé → rien', () => {
    expect(approvalScopeOf(MANAGER)).toEqual({ kind: 'direct-reports', managerId: 'mgr-1' })
    expect(approvalScopeOf(HR)).toEqual({ kind: 'company-root-managers', hrId: 'hr-1' })
    expect(approvalScopeOf(EMPLOYEE)).toBeNull()
  })
})

describe('decideExpenseNote', () => {
  it('approuve une note en attente du périmètre, dans le contexte du valideur', async () => {
    const tx = transactionOver(new InMemoryApprovals(new Map([['mgr-1', [note()]]])))
    const decided = await makeDecideExpenseNote({ transaction: tx })({ actor: MANAGER, noteId: 'note-1', decision: 'approve' })
    expect(decided.status).toBe('approved')
    expect(tx.actors).toEqual(['mgr-1'])
  })

  it('rejette une note en attente', async () => {
    const tx = transactionOver(new InMemoryApprovals(new Map([['hr-1', [note()]]])))
    const decided = await makeDecideExpenseNote({ transaction: tx })({ actor: HR, noteId: 'note-1', decision: 'reject' })
    expect(decided.status).toBe('rejected')
  })

  it('note hors périmètre ou inexistante → NotFound (404 sans révéler son existence)', async () => {
    const tx = transactionOver(new InMemoryApprovals(new Map([['autre-manager', [note()]]])))
    await expect(
      makeDecideExpenseNote({ transaction: tx })({ actor: MANAGER, noteId: 'note-1', decision: 'approve' })
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('note déjà tranchée → Conflict « Already decided »', async () => {
    const tx = transactionOver(new InMemoryApprovals(new Map([['mgr-1', [note({ status: 'approved' })]]])))
    await expect(
      makeDecideExpenseNote({ transaction: tx })({ actor: MANAGER, noteId: 'note-1', decision: 'reject' })
    ).rejects.toEqual(new ConflictError('Already decided'))
  })

  it('décision concurrente perdue (écriture conditionnée refusée) → Conflict « Already decided »', async () => {
    const tx = transactionOver(new InMemoryApprovals(new Map([['mgr-1', [note()]]]), true))
    await expect(
      makeDecideExpenseNote({ transaction: tx })({ actor: MANAGER, noteId: 'note-1', decision: 'approve' })
    ).rejects.toEqual(new ConflictError('Already decided'))
  })

  it('un employé ne tranche rien, sans ouvrir de transaction', async () => {
    const tx = transactionOver(new InMemoryApprovals(new Map([['emp-1', [note()]]])))
    await expect(
      makeDecideExpenseNote({ transaction: tx })({ actor: EMPLOYEE, noteId: 'note-1', decision: 'approve' })
    ).rejects.toBeInstanceOf(NotFoundError)
    expect(tx.actors).toEqual([])
  })
})

describe('listPendingNotes', () => {
  it('seules les notes en attente du périmètre', async () => {
    const repo = new InMemoryApprovals(new Map([['mgr-1', [note(), note({ id: 'note-2', status: 'rejected' })]]]))
    const notes = await makeListPendingNotes({ transaction: transactionOver(repo) })(MANAGER)
    expect(notes.map((n) => n.id)).toEqual(['note-1'])
  })
})

describe('getReceiptUrlForApprover', () => {
  it('URL signée du reçu d’une note du périmètre', async () => {
    const receipts = { upload: vi.fn(), getSignedUrl: vi.fn(async (key: string) => `https://s3/${key}`) }
    const tx = transactionOver(new InMemoryApprovals(new Map([['mgr-1', [note()]]])))
    const url = await makeGetReceiptUrlForApprover({ transaction: tx, receipts })(MANAGER, 'note-1')
    expect(url).toBe('https://s3/receipts/abc.png')
  })

  it('note d’une autre équipe → NotFound, aucune URL signée (SEC-02)', async () => {
    const receipts = { upload: vi.fn(), getSignedUrl: vi.fn() }
    const tx = transactionOver(new InMemoryApprovals(new Map([['autre-manager', [note()]]])))
    await expect(makeGetReceiptUrlForApprover({ transaction: tx, receipts })(MANAGER, 'note-1')).rejects.toBeInstanceOf(
      NotFoundError
    )
    expect(receipts.getSignedUrl).not.toHaveBeenCalled()
  })
})
