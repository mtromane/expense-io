import type { ExpenseNote } from '@/domain/ExpenseNote'
import type { ApprovalScope } from '../domain/ApprovalPolicy'

/** Note en attente vue par un valideur, avec le nom de son auteur (MET-08). */
export interface PendingNote {
  note: ExpenseNote
  authorName: string
}

/**
 * File d'attente d'un valideur : notes en attente de son périmètre, avec le nom
 * de leur auteur, par date de création croissante. Lue dans le contexte de
 * l'acteur (RLS), en une seule requête.
 */
export interface ApprovalQueue {
  listPending(actorId: string, scope: ApprovalScope): Promise<PendingNote[]>
}
