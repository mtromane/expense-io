/**
 * Façade historique : Auth.js vit dans le module identity. Conservée parce que
 * tests/unit/proxy.test.ts remplace ce chemin (vi.mock) : src/proxy.ts doit
 * continuer à l'importer.
 */
export { auth, handlers, signIn, signOut } from '@/modules/identity'
