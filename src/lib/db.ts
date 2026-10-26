/**
 * Façade historique : l'accès base vit dans modules/shared/infrastructure/db.
 * Conservée parce que les unitaires de la team Tests importent ce chemin.
 */
export { getPool, withUserScope } from '@/modules/shared/infrastructure/db'
