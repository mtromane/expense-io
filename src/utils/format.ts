const currencyFormatters = new Map<string, Intl.NumberFormat>()

export function formatCurrency(amount: number, currency = 'EUR'): string {
  let formatter = currencyFormatters.get(currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency })
    currencyFormatters.set(currency, formatter)
  }
  return formatter.format(amount)
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })
// Une date AAAA-MM-JJ est un jour du calendrier, pas un instant : elle est
// formatée en UTC pour s'afficher telle quelle quel que soit le fuseau (BUG-01).
const calendarDateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' })

export function formatDate(value: string | Date): string {
  if (typeof value === 'string') {
    const dateOnly = DATE_ONLY_PATTERN.exec(value)
    if (dateOnly) {
      const [, year, month, day] = dateOnly
      return calendarDateFormatter.format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))))
    }
    return dateFormatter.format(new Date(value))
  }
  return dateFormatter.format(value)
}

export function truncate(value: string, maxLength = 40): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value
}
