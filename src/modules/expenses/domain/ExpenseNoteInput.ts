import { InvalidInputError } from '@/modules/shared/domain'

/** Plus grand montant représentable par la colonne numeric(10, 2). */
const MAX_AMOUNT = 99_999_999.99
const AMOUNT_PATTERN = /^(\d+\.?\d*|\.\d+)$/
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export interface NewExpenseNoteFields {
  amount: number
  expenseDate: string
  description: string
}

function parseAmount(raw: unknown): number {
  if (typeof raw !== 'string' || !AMOUNT_PATTERN.test(raw.trim())) throw new InvalidInputError()
  const amount = Number(raw.trim())
  // Le montant est stocké à 2 décimales (arrondi par la base, comportement conservé).
  const stored = Math.round(amount * 100) / 100
  if (!(amount > 0) || stored > MAX_AMOUNT) throw new InvalidInputError()
  return amount
}

function parseDate(raw: unknown): string {
  const match = typeof raw === 'string' ? DATE_PATTERN.exec(raw) : null
  if (!match) throw new InvalidInputError()
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  const exists = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  if (!exists || year < 1) throw new InvalidInputError()
  return raw as string
}

/**
 * Champs d'une nouvelle note : montant décimal positif tenant dans
 * numeric(10, 2) (ROB-03c, ROB-03d), date `YYYY-MM-DD` réelle (ROB-03b),
 * description non vide. Toute violation → 400 « Champs invalides ».
 */
export function parseNewExpenseNote(input: { amount: unknown; expenseDate: unknown; description: unknown }): NewExpenseNoteFields {
  const amount = parseAmount(input.amount)
  const expenseDate = parseDate(input.expenseDate)
  if (typeof input.description !== 'string' || input.description.trim().length === 0) throw new InvalidInputError()
  return { amount, expenseDate, description: input.description }
}
