/**
 * Configuration de l'application (Twelve Factor : la configuration vit dans
 * l'environnement). Chaque section est lue à l'appel, jamais mise en cache :
 * les tests unitaires changent l'environnement entre deux appels, et un
 * module importé au build ne doit pas exiger des variables d'exécution.
 *
 * `assertServerConfig()` est appelé au démarrage du serveur
 * (src/instrumentation.ts) : une variable obligatoire absente empêche le
 * serveur de démarrer au lieu de le faire tomber à la première requête.
 */

export class ConfigError extends Error {
  constructor(variable: string) {
    super(`${variable} is not set`)
    this.name = 'ConfigError'
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new ConfigError(name)
  return value
}

function optional(name: string, fallback: string): string {
  const value = process.env[name]?.trim()
  return value ? value : fallback
}

export function databaseUrl(): string {
  return required('DATABASE_URL')
}

/** Secret de signature des sessions Auth.js (SEC-04 : jamais écrit dans le code). */
export function authSecret(): string {
  return required('AUTH_SECRET')
}

/** Même variable, sans exiger sa présence : pour le code chargé pendant le build. */
export function readAuthSecret(): string | undefined {
  return process.env.AUTH_SECRET?.trim() || undefined
}

export interface S3Config {
  endpoint: string | undefined
  region: string
  forcePathStyle: boolean
  accessKeyId: string
  secretAccessKey: string
  bucket: string
}

export function s3Config(): S3Config {
  return {
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: optional('S3_REGION', 'us-east-1'),
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    bucket: optional('S3_BUCKET', 'receipts'),
  }
}

/**
 * Rôle PostgreSQL sans privilège pris dans chaque transaction scopée, pour que
 * la RLS s'applique (ADR-006). Créé par la migration d'isolation.
 */
export function appDbRole(): string {
  return optional('APP_DB_ROLE', 'expense_app')
}

/** Variables sans lesquelles le serveur refuse de démarrer. */
export function assertServerConfig(): void {
  databaseUrl()
  authSecret()
}
