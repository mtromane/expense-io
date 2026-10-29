import { describe, expect, it, vi } from 'vitest'
import { makeSubmitExpenseNote } from '@/modules/expenses/application/submitExpenseNote'
import { parseNewExpenseNote } from '@/modules/expenses/domain/ExpenseNoteInput'
import type { ExpenseTransaction } from '@/modules/expenses/ports/ExpenseNoteRepository'
import { InvalidInputError } from '@/modules/shared/domain'

/**
 * D20, MET-06 (M-09) : une dépense ne peut pas être datée après demain (UTC).
 * Le jour de marge couvre les fuseaux en avance sur UTC. Horloge injectée.
 */

const FIELDS = { amount: '42.50', description: 'Taxi' }
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d])
const OCT_29_NOON = new Date('2026-10-29T12:00:00Z')

describe('parseNewExpenseNote : date future (D20, MET-06)', () => {
  for (const expenseDate of ['2026-01-01', '2026-10-29', '2026-10-30']) {
    it(`${expenseDate} acceptée le 29 octobre 2026`, () => {
      expect(parseNewExpenseNote({ ...FIELDS, expenseDate }, OCT_29_NOON).expenseDate).toBe(expenseDate)
    })
  }

  for (const expenseDate of ['2026-10-31', '2026-11-15', '2999-12-31']) {
    it(`${expenseDate} refusée le 29 octobre 2026`, () => {
      expect(() => parseNewExpenseNote({ ...FIELDS, expenseDate }, OCT_29_NOON)).toThrow(InvalidInputError)
    })
  }

  it('la marge suit la date UTC, y compris au changement d’année', () => {
    const newYearsEve = new Date('2026-12-31T23:30:00Z')
    expect(parseNewExpenseNote({ ...FIELDS, expenseDate: '2027-01-01' }, newYearsEve).expenseDate).toBe('2027-01-01')
    expect(() => parseNewExpenseNote({ ...FIELDS, expenseDate: '2027-01-02' }, newYearsEve)).toThrow(InvalidInputError)
  })
})

describe('submitExpenseNote : date future (D20, MET-06)', () => {
  it('refusée selon l’horloge injectée, avant tout téléversement du reçu', async () => {
    const insert = vi.fn()
    const transaction: ExpenseTransaction = {
      run: (_actor, work) => work({ listByOwner: vi.fn(), findReceiptKey: vi.fn(), insert }),
    }
    const receipts = { upload: vi.fn(), getSignedUrl: vi.fn(), delete: vi.fn() }
    const submit = makeSubmitExpenseNote({ transaction, receipts, newId: () => 'id', now: () => OCT_29_NOON })
    const receipt = { declaredType: 'image/png', size: PNG.length, read: vi.fn(async () => PNG) }

    await expect(
      submit({ actor: { id: 'emp-1' }, ...FIELDS, expenseDate: '2026-10-31', receipt })
    ).rejects.toEqual(new InvalidInputError())
    expect(receipts.upload).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })
})
