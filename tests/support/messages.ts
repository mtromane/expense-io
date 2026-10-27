import { DEFECTS } from '../defects/registry'

/**
 * Messages d'erreur de l'API passés en anglais par la décision D15 (défaut
 * API-01). Tant que API-01 n'est pas corrigé, et toujours sur la baseline
 * (BASELINE=1), le message attendu est celui d'origine : les tests de parité
 * restent valides des deux côtés. Le passage à l'anglais lui-même est vérifié
 * par tests/defects/metier.spec.ts.
 */
export const API_MESSAGES = {
  'Champs invalides': 'Invalid fields',
  'Type de fichier non autorisé pour le reçu': 'Receipt file type not allowed',
  'Fichier trop volumineux': 'File too large',
} as const

export type OriginalApiMessage = keyof typeof API_MESSAGES

export function apiError(original: OriginalApiMessage): { error: string } {
  const translated = DEFECTS['API-01'].fixed && process.env.BASELINE !== '1'
  return { error: translated ? API_MESSAGES[original] : original }
}
