import { describe, expect, it, vi } from 'vitest'
import { respondError } from '@/lib/errors'
import { formatCurrency, formatDate, truncate } from '@/utils/format'
import { isNonEmptyString, isPositiveAmount, isValidEmail } from '@/utils/validators'

/**
 * Utilitaires. `src/utils/` n'est pas encore utilisé par les routes ni les
 * pages (elles dupliquent ces règles) : ces tests fixent les règles que le
 * code factorisé devra respecter. `isValidEmail` reprend l'expression de
 * l'inscription (src/app/actions/auth.ts).
 */

describe('isValidEmail (même règle que l’inscription)', () => {
  for (const email of ['demo@expense.io', 'prenom.nom@sous.domaine.fr', 'a+tag@b.co']) {
    it(`${email} valide`, () => {
      expect(isValidEmail(email)).toBe(true)
    })
  }
  for (const email of ['a@b', 'sans-arobase.fr', '@expense.io', 'demo@', 'de mo@expense.io', 'a@@b.fr', '']) {
    it(`« ${email} » invalide`, () => {
      expect(isValidEmail(email)).toBe(false)
    })
  }
})

describe('isPositiveAmount', () => {
  it('montants strictement positifs et finis', () => {
    expect(isPositiveAmount(0.01)).toBe(true)
    expect(isPositiveAmount(99999999.99)).toBe(true)
  })
  it('zéro, négatif, NaN et infini refusés', () => {
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) expect(isPositiveAmount(value)).toBe(false)
  })
})

describe('isNonEmptyString', () => {
  it('chaîne avec contenu', () => {
    expect(isNonEmptyString('Taxi')).toBe(true)
  })
  it('vide, blanche ou autre type refusés', () => {
    for (const value of ['', '   ', 42, null, undefined]) expect(isNonEmptyString(value)).toBe(false)
  })
})

describe('format (fr-FR)', () => {
  it('montant en euros, virgule décimale', () => {
    expect(formatCurrency(42.5)).toMatch(/^42,50[  ]€$/)
    expect(formatCurrency(1234.5)).toMatch(/^1[   ]234,50[  ]€$/)
  })
  it('date AAAA-MM-JJ en format moyen', () => {
    expect(formatDate('2026-03-12')).toBe('12 mars 2026')
  })
  it('troncature avec points de suspension, longueur maximale respectée', () => {
    expect(truncate('court', 40)).toBe('court')
    expect(truncate('abcdef', 5)).toBe('abcd…')
    expect(truncate('x'.repeat(41))).toHaveLength(40)
    expect(truncate('x'.repeat(40))).toBe('x'.repeat(40))
  })
})

describe('respondError', () => {
  // La forme exacte du corps sera revue par SEC-05 (plus de stack) : seuls le
  // code et le champ `error` sont figés ici.
  it('Error → 500 et corps JSON { error: string }', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = respondError(new Error('boom'))
    expect(response.status).toBe(500)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(typeof (await response.json()).error).toBe('string')
  })
  it('valeur non-Error → 500 quand même', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = respondError('panne')
    expect(response.status).toBe(500)
    expect(typeof (await response.json()).error).toBe('string')
  })
})
