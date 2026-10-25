import type { ExpenseNote } from '@/domain/ExpenseNote'
import type { Actor } from '@/modules/shared/domain'
import { parseSortOrder } from '../domain/SortOrder'
import type { ExpenseTransaction } from '../ports/ExpenseNoteRepository'

/** Notes de l'acteur ; `sort` vient de la requête (`?sort=`), validé par liste blanche. */
export function makeListMyExpenseNotes(deps: { transaction: ExpenseTransaction }) {
  return async (actor: Actor, sort: string | null): Promise<ExpenseNote[]> => {
    const order = parseSortOrder(sort)
    return deps.transaction.run(actor.id, (notes) => notes.listByOwner(actor.id, order))
  }
}
