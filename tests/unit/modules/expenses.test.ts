import { describe, expect, it, vi } from 'vitest'
import { ExpenseNote } from '@/domain/ExpenseNote'
import { makeSubmitExpenseNote, type IncomingReceipt } from '@/modules/expenses/application/submitExpenseNote'
import { parseNewExpenseNote } from '@/modules/expenses/domain/ExpenseNoteInput'
import { detectReceiptType } from '@/modules/expenses/domain/ReceiptFile'
import { parseSortOrder } from '@/modules/expenses/domain/SortOrder'
import type { ExpenseNoteRepository, ExpenseTransaction } from '@/modules/expenses/ports/ExpenseNoteRepository'
import { InvalidInputError, type Actor } from '@/modules/shared/domain'

/**
 * Module expenses : règles de saisie, tri par liste blanche, signature des
 * reçus et ordre téléversement → insertion avec compensation. Ports simulés.
 */

const EMP: Actor = { id: 'emp-1', role: 'employee' }
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d])
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
const WEBP = new Uint8Array([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP')])
const PDF = new Uint8Array(Buffer.from('%PDF-1.4\n'))

describe('parseSortOrder (SEC-01)', () => {
  it('sans paramètre : created_at DESC', () => {
    expect(parseSortOrder(null)).toEqual({ column: 'created_at', direction: 'DESC' })
  })
  it('tris légitimes acceptés', () => {
    expect(parseSortOrder('amount ASC')).toEqual({ column: 'amount', direction: 'ASC' })
    expect(parseSortOrder('expense_date desc')).toEqual({ column: 'expense_date', direction: 'DESC' })
    expect(parseSortOrder('status')).toEqual({ column: 'status', direction: 'ASC' })
  })
  for (const sort of ['colonne_inexistante', 'lower(description) ASC', 'amount ASC; DROP TABLE users', 'amount ASC, id']) {
    it(`« ${sort} » refusé`, () => {
      expect(() => parseSortOrder(sort)).toThrow(InvalidInputError)
    })
  }
})

describe('parseNewExpenseNote (ROB-03b à d)', () => {
  const valid = { amount: '42.50', expenseDate: '2026-03-12', description: 'Taxi' }

  it('saisie valide', () => {
    expect(parseNewExpenseNote(valid)).toEqual({ amount: 42.5, expenseDate: '2026-03-12', description: 'Taxi' })
  })
  it('plus grand montant stockable accepté', () => {
    expect(parseNewExpenseNote({ ...valid, amount: '99999999.99' }).amount).toBe(99999999.99)
  })
  for (const amount of ['12abc', '100000000', '0', '-5', '', '1e3', '12,50']) {
    it(`montant « ${amount} » refusé`, () => {
      expect(() => parseNewExpenseNote({ ...valid, amount })).toThrow(InvalidInputError)
    })
  }
  for (const expenseDate of ['pas-une-date', '2026-02-30', '12/03/2026', '2026-3-12']) {
    it(`date « ${expenseDate} » refusée`, () => {
      expect(() => parseNewExpenseNote({ ...valid, expenseDate })).toThrow(InvalidInputError)
    })
  }
  it('29 février d’une année bissextile accepté', () => {
    expect(parseNewExpenseNote({ ...valid, expenseDate: '2024-02-29' }).expenseDate).toBe('2024-02-29')
  })
  it('description vide refusée', () => {
    expect(() => parseNewExpenseNote({ ...valid, description: '   ' })).toThrow(InvalidInputError)
  })
})

describe('detectReceiptType (SEC-07)', () => {
  it('reconnaît PNG, JPEG, WebP et PDF par leur contenu', () => {
    expect(detectReceiptType(PNG)).toBe('image/png')
    expect(detectReceiptType(JPEG)).toBe('image/jpeg')
    expect(detectReceiptType(WEBP)).toBe('image/webp')
    expect(detectReceiptType(PDF)).toBe('application/pdf')
  })
  it('texte déguisé en image : inconnu', () => {
    expect(detectReceiptType(new Uint8Array(Buffer.from('ceci n’est pas une image')))).toBeNull()
  })
})

function harness(options: { insertFails?: boolean } = {}) {
  const calls: string[] = []
  const repo: ExpenseNoteRepository = {
    listByOwner: vi.fn(),
    findReceiptKey: vi.fn(),
    insert: vi.fn(async (ownerId, fields, key) => {
      calls.push(`insert ${key}`)
      if (options.insertFails) throw new Error('base indisponible')
      return new ExpenseNote({ id: 'note-1', userId: ownerId, ...fields, receiptKey: key, status: 'pending', createdAt: '2026-03-12T10:00:00.000Z' })
    }),
  }
  const transaction: ExpenseTransaction = { run: (_actor, work) => work(repo) }
  const receipts = {
    upload: vi.fn(async (key: string) => void calls.push(`upload ${key}`)),
    getSignedUrl: vi.fn(),
    delete: vi.fn(async (key: string) => void calls.push(`delete ${key}`)),
  }
  const submit = makeSubmitExpenseNote({ transaction, receipts, newId: () => '7f1c2e64-9a1b-4c3d-8e5f-0a1b2c3d4e5f' })
  return { submit, calls, receipts }
}

function file(bytes: Uint8Array, declaredType = 'image/png', size = bytes.length): IncomingReceipt {
  return { declaredType, size, read: vi.fn(async () => bytes) }
}

const command = (receipt: IncomingReceipt | null) => ({
  actor: EMP,
  amount: '42.50',
  expenseDate: '2026-03-12',
  description: 'Taxi',
  receipt,
})

describe('submitExpenseNote', () => {
  it('téléverse le reçu sous une clé opaque, puis insère la note (SEC-06, ROB-01)', async () => {
    const { submit, calls } = harness()
    const note = await submit(command(file(PNG)))
    expect(calls).toEqual([
      'upload receipts/7f1c2e64-9a1b-4c3d-8e5f-0a1b2c3d4e5f.png',
      'insert receipts/7f1c2e64-9a1b-4c3d-8e5f-0a1b2c3d4e5f.png',
    ])
    expect(note.toJSON().receiptKey).toBe('receipts/7f1c2e64-9a1b-4c3d-8e5f-0a1b2c3d4e5f.png')
  })

  it('insertion en échec : le reçu est supprimé et l’erreur propagée', async () => {
    const { submit, calls } = harness({ insertFails: true })
    await expect(submit(command(file(PNG)))).rejects.toThrow('base indisponible')
    expect(calls.at(-1)).toBe('delete receipts/7f1c2e64-9a1b-4c3d-8e5f-0a1b2c3d4e5f.png')
  })

  it('contenu non conforme au type déclaré → 400 type refusé, rien n’est téléversé (SEC-07)', async () => {
    const { submit, receipts } = harness()
    await expect(submit(command(file(new Uint8Array(Buffer.from('texte')), 'image/png')))).rejects.toEqual(
      new InvalidInputError('Receipt file type not allowed')
    )
    expect(receipts.upload).not.toHaveBeenCalled()
  })

  it('fichier de plus de 10 Mo refusé sans être lu', async () => {
    const { submit } = harness()
    const big = file(PNG, 'image/png', 10 * 1024 * 1024 + 1)
    await expect(submit(command(big))).rejects.toEqual(new InvalidInputError('File too large'))
    expect(big.read).not.toHaveBeenCalled()
  })

  it('reçu absent → Invalid fields', async () => {
    const { submit } = harness()
    await expect(submit(command(null))).rejects.toEqual(new InvalidInputError('Invalid fields'))
  })
})
