/**
 * Façade historique : le client S3 des reçus vit dans
 * modules/shared/infrastructure/s3ReceiptStorage. Conservée parce que les
 * unitaires de la team Tests importent ce chemin.
 */
export { deleteReceipt, getReceiptUrl, uploadReceipt } from '@/modules/shared/infrastructure/s3ReceiptStorage'
