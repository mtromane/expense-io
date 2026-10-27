import { InvalidInputError } from '@/modules/shared/domain'

export const SORTABLE_COLUMNS = ['created_at', 'amount', 'expense_date', 'description', 'status'] as const
export type SortColumn = (typeof SORTABLE_COLUMNS)[number]

export interface SortOrder {
  column: SortColumn
  direction: 'ASC' | 'DESC'
}

export const DEFAULT_SORT: SortOrder = { column: 'created_at', direction: 'DESC' }

const SORT_PATTERN = new RegExp(`^(${SORTABLE_COLUMNS.join('|')})(?:\\s+(asc|desc))?$`, 'i')

/**
 * Tri par liste blanche (SEC-01) : `<colonne> [ASC|DESC]`. Tout autre valeur
 * est refusée au lieu d'être concaténée dans le SQL.
 */
export function parseSortOrder(raw: string | null): SortOrder {
  if (raw === null || raw === '') return DEFAULT_SORT
  const match = SORT_PATTERN.exec(raw.trim())
  if (!match) throw new InvalidInputError()
  const direction = match[2]?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'
  return { column: match[1].toLowerCase() as SortColumn, direction }
}
