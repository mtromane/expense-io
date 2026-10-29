import type { Actor } from '@/modules/shared/domain'

/**
 * Qui voit et tranche quelles notes (règle unique pour les listes, les
 * décisions et les reçus côté valideur) :
 * - un manager : les notes de ses rattachés directs ;
 * - une RH : les notes de quiconque n'a pas de manager dans son entreprise :
 *   managers, employés (MET-02) et autres RH (MET-10, réunion du 2026-10-28).
 *   Jamais ses propres notes : une RH sans manager est validée par une autre
 *   RH ; sans manager ni autre RH, ses notes restent en attente.
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
