import type { Actor } from '@/modules/shared/domain'

/**
 * Qui voit et tranche quelles notes (règle unique pour les listes, les
 * décisions et les reçus côté valideur) :
 * - un manager : les notes de ses rattachés directs ;
 * - une RH : les notes des managers et des employés sans manager de son
 *   entreprise (MET-02 : aucune note sans valideur). Jamais ses propres notes.
 * Les autres rôles ne valident rien.
 */
export type ApprovalScope =
  | { kind: 'direct-reports'; managerId: string }
  | { kind: 'company-without-manager'; hrId: string }

export function approvalScopeOf(actor: Actor): ApprovalScope | null {
  if (actor.role === 'manager') return { kind: 'direct-reports', managerId: actor.id }
  if (actor.role === 'hr_admin') return { kind: 'company-without-manager', hrId: actor.id }
  return null
}
