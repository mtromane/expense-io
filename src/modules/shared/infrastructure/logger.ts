/**
 * Journal structuré (une ligne JSON par événement), lisible par un agrégateur
 * de logs. Les détails techniques (stack, message SQL) restent côté serveur.
 */
type Level = 'info' | 'warn' | 'error'

export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ time: new Date().toISOString(), level, event, ...fields })
  if (level === 'error') console.error(line)
  else console.log(line)
}

export function describeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) return { error: error.message, name: error.name, stack: error.stack }
  return { error: String(error) }
}
