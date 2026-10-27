import { test } from '@playwright/test'

/**
 * Registre des défauts techniques (spec §5.1) et métier (décisions D12 à D19). Corriger un défaut =
 * passer `fixed` à true dans la PR du fix : le test redevient un test normal.
 * Un test de défaut qui passe alors que `fixed` est false fait échouer la CI.
 * BASELINE=1 (job baseline-proof) force l'échec attendu pour tous.
 */
export const DEFECTS = {
  'SEC-01': { title: 'Injection SQL via ?sort=', fixed: true },
  'SEC-02': { title: 'Reçu manager sans contrôle de rattachement', fixed: true },
  'SEC-03': { title: 'Assignation d’un manager d’une autre entreprise', fixed: true },
  'SEC-04': { title: 'AUTH_SECRET en dur, variable d’environnement ignorée', fixed: true },
  'SEC-05': { title: 'Stack trace renvoyée dans les 500', fixed: true },
  'ROB-02': { title: 'Double décision concurrente', fixed: true },
  'ROB-03a': { title: 'UUID invalide → 500', fixed: true },
  'ROB-03b': { title: 'Date invalide → 500', fixed: true },
  'ROB-03c': { title: 'Montant hors numeric(10,2) → 500', fixed: true },
  'ROB-03d': { title: 'Montant non numérique accepté', fixed: true },
  'ROB-03f': { title: 'Montant arrondi à 0,00 par numeric(10,2) accepté (0.004 → note à 0 €)', fixed: false },
  'ROB-03e': { title: 'PUT manager sans JSON valide désassigne le manager', fixed: true },
  'SEC-06': { title: 'Clés de reçu séquentielles et prévisibles', fixed: true },
  'SEC-07': { title: 'Type de reçu validé sur le MIME déclaré par le client', fixed: true },
  'SEC-08': { title: 'Suggestion OCR sans limite de taille', fixed: true },
  'SEC-09': { title: 'RLS inopérante (rôle de base superuser)', fixed: true },
  'ROB-01': { title: 'Création de note non atomique (S3 hors transaction)', fixed: true },
  'BUG-01': { title: 'Date affichée décalée d’un jour en fuseau négatif', fixed: true },
  // Défauts métier tranchés le 2026-10-26 (docs/audit/21-decisions-architecture.md, D12 à D19).
  'AUTHZ-01': { title: 'Mauvais rôle sur /api/manager/* → 401 au lieu de 403 (D12)', fixed: true },
  'AUTHZ-02': { title: 'Anonyme sur /api/hr/* → 403 au lieu de 401 (D12)', fixed: true },
  'AUTHZ-03': { title: 'Page « Accès réservé » servie en 200 au lieu de 403 (D19)', fixed: true },
  'MET-01': { title: 'Inscription acceptée sur un domaine de messagerie public (D16)', fixed: true },
  'MET-02': { title: 'Notes d’un employé sans manager vues par aucun valideur', fixed: false },
  'MET-03': { title: 'Notes d’une RH validables par personne (D13)', fixed: true },
  'MET-04': { title: 'Cycle hiérarchique accepté (D18)', fixed: true },
  'ROLE-01': { title: 'Aucun moyen de nommer ou rétrograder un manager (D14)', fixed: true },
  'ROLE-02': { title: 'Rétrogradation d’un manager qui a encore des subordonnés (D14)', fixed: true },
  'ROLE-03': { title: 'Changement de rôle sans effet avant reconnexion (D14, V-19)', fixed: true },
  'API-01': { title: 'Messages d’erreur de l’API en partie en français (D15)', fixed: true },
  'UI-01': { title: '« Mes notes » : total sans détail par statut, rejetées comprises (D17)', fixed: true },
} satisfies Record<string, { title: string; fixed: boolean }>

export type DefectId = keyof typeof DEFECTS

export function expectDefect(id: DefectId): void {
  const pending = !DEFECTS[id].fixed || process.env.BASELINE === '1'
  test.fail(pending, `${id} non corrigé : ${DEFECTS[id].title}`)
}
