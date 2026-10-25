import type { ExpenseNote } from '@/domain/ExpenseNote'
import type { ApprovalScope } from '../domain/ApprovalPolicy'

/** Accès aux notes vu par un valideur, toujours borné à son périmètre. */
export interface ApprovalRepository {
  /** Notes en attente du périmètre, par date de création croissante. */
  listPending(scope: ApprovalScope): Promise<ExpenseNote[]>
  /** Note du périmètre (quel que soit son statut), ou null. */
  findInScope(scope: ApprovalScope, noteId: string): Promise<ExpenseNote | null>
  /**
   * Enregistre la décision seulement si la note est encore en attente
   * (écriture conditionnée au statut) ; null si une autre décision est passée avant.
   */
  saveDecision(note: ExpenseNote): Promise<ExpenseNote | null>
}

/** Frontière de transaction : le travail s'exécute dans le contexte de l'acteur. */
export interface ApprovalTransaction {
  run<T>(actorId: string, work: (approvals: ApprovalRepository) => Promise<T>): Promise<T>
}
