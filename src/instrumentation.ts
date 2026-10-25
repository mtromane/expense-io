/**
 * Exécuté une fois au démarrage du serveur Next.js. Une configuration
 * incomplète (AUTH_SECRET ou DATABASE_URL absent) arrête le processus au lieu
 * de laisser un serveur qui échouerait à chaque requête.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { assertServerConfig } = await import('@/config')
  try {
    assertServerConfig()
  } catch (error) {
    console.error(`[config] Démarrage refusé : ${(error as Error).message}`)
    process.exit(1)
  }
}
