import { test } from '@playwright/test'

/**
 * Registre des défauts techniques (spec §5.1). Corriger un défaut =
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
  'ROB-03e': { title: 'PUT manager sans JSON valide désassigne le manager', fixed: true },
  'SEC-06': { title: 'Clés de reçu séquentielles et prévisibles', fixed: true },
  'SEC-07': { title: 'Type de reçu validé sur le MIME déclaré par le client', fixed: true },
  'SEC-08': { title: 'Suggestion OCR sans limite de taille', fixed: true },
  'SEC-09': { title: 'RLS inopérante (rôle de base superuser)', fixed: true },
  'ROB-01': { title: 'Création de note non atomique (S3 hors transaction)', fixed: true },
  'BUG-01': { title: 'Date affichée décalée d’un jour en fuseau négatif', fixed: true },
} satisfies Record<string, { title: string; fixed: boolean }>

export type DefectId = keyof typeof DEFECTS

export function expectDefect(id: DefectId): void {
  const pending = !DEFECTS[id].fixed || process.env.BASELINE === '1'
  test.fail(pending, `${id} non corrigé : ${DEFECTS[id].title}`)
}
