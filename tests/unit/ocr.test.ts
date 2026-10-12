import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Règles d'extraction de la suggestion OCR (src/lib/ocr.ts).
 *
 * Tesseract est simulé : le test fournit le texte « reconnu », ce qui isole
 * les règles montant / date du moteur. Les deux API de tesseract.js sont
 * simulées (worker direct ou scheduler) pour que ces tests restent valables
 * quand PERF-01 réutilisera un worker ou un pool au lieu d'en créer un par
 * requête. Les tests de référence boîte noire (tests/api/ocr.spec.ts)
 * vérifient le moteur réel sur des images fixes.
 */

const engine = vi.hoisted(() => {
  const recognize = vi.fn<(image: unknown) => Promise<{ data: { text: string } }>>()
  const newWorker = () => ({
    recognize,
    terminate: vi.fn(async () => undefined),
    setParameters: vi.fn(async () => undefined),
  })
  const createWorker = vi.fn(async () => newWorker())
  const createScheduler = vi.fn(() => ({
    addWorker: vi.fn(),
    addJob: vi.fn(async (action: string, image: unknown) => (action === 'recognize' ? recognize(image) : undefined)),
    getNumWorkers: vi.fn(() => 1),
    terminate: vi.fn(async () => undefined),
  }))
  return { recognize, createWorker, createScheduler }
})

vi.mock('tesseract.js', () => {
  const api = { createWorker: engine.createWorker, createScheduler: engine.createScheduler }
  return { ...api, default: api }
})

type SuggestFields = typeof import('@/lib/ocr').suggestFields
let suggestFields: SuggestFields

const PNG = { data: Buffer.from('image'), mimeType: 'image/png' }

function lines(...content: string[]): string {
  return content.join('\n')
}

async function suggestFromText(text: string) {
  engine.recognize.mockResolvedValue({ data: { text } })
  return suggestFields(PNG)
}

beforeEach(async () => {
  engine.recognize.mockReset()
  engine.createWorker.mockClear()
  // Module neuf à chaque test : un worker mis en cache par une version
  // optimisée ne fuit pas d'un test à l'autre.
  vi.resetModules()
  ;({ suggestFields } = await import('@/lib/ocr'))
})

describe('OCR — montant', () => {
  const cases: [string, string, number | undefined][] = [
    ['ligne TOTAL, décimales à la virgule', 'TOTAL TTC 42,50 EUR', 42.5],
    ['décimales au point', 'Total 42.50', 42.5],
    ['la ligne mot-clé prime sur un montant plus élevé ailleurs', lines('Plat du jour 130,00', 'TOTAL 42,50'), 42.5],
    ['sans mot-clé : le plus grand montant décimal du ticket', lines('Plat du jour 30,00', 'Boisson 12,50'), 30],
    ['sur la ligne mot-clé : le plus grand montant (TVA ignorée)', 'TOTAL 10,00 dont TVA 1,67', 10],
    ['mot-clé insensible à la casse (MONTANT)', lines('Article 99,00', 'MONTANT 18,90'), 18.9],
    ['mot-clé « à payer »', lines('Consommation 99,00', 'Net à payer 12,00'), 12],
    ['mot-clé TTC', lines('Remise 50,00', 'TTC 20,00'), 20],
    ['séparateur de milliers espace', 'TOTAL 1 234,56', 1234.56],
    ['séparateur de milliers point', 'TOTAL 1.234,56', 1234.56],
    ['plusieurs groupes de milliers', 'TOTAL 1 234 567,89', 1234567.89],
    ['sans centimes, ligne mot-clé', 'TOTAL 15', 15],
    ['sans centimes, symbole €', lines('Parking', 'Forfait 8 €'), 8],
    ['sans centimes, devise EUR', 'Course 35 EUR', 35],
    ['sans centimes : le plus grand entier de la ligne', 'Total 3 articles 45 €', 45],
    ['entiers ignorés hors ligne mot-clé ou devise', lines('Table 12', 'Couverts 4'), undefined],
    ['montant nul ignoré', 'TOTAL 0,00', undefined],
    ['texte vide', '', undefined],
  ]
  for (const [name, text, expected] of cases) {
    it(name, async () => {
      expect((await suggestFromText(text)).amount).toBe(expected)
    })
  }
})

describe('OCR — date', () => {
  const cases: [string, string, string | undefined][] = [
    ['jj/mm/aaaa', 'Date : 12/03/2026', '2026-03-12'],
    ['jj-mm-aaaa', '12-03-2026', '2026-03-12'],
    ['jj.mm.aaaa', '12.03.2026', '2026-03-12'],
    ['jour et mois sur un chiffre', '5/3/2026', '2026-03-05'],
    ['ISO aaaa-mm-jj', '2026-01-20', '2026-01-20'],
    ['année sur deux chiffres → 20xx', '20/01/26', '2026-01-20'],
    ['mois en toutes lettres', 'Le 5 mars 2026', '2026-03-05'],
    ['mois accentué', '14 février 2026', '2026-02-14'],
    ['août', '3 août 2026', '2026-08-03'],
    ['majuscules accentuées', '25 DÉCEMBRE 2025', '2025-12-25'],
    ['29 février d’une année bissextile', '29/02/2024', '2024-02-29'],
    ['29 février d’une année non bissextile → aucune date', '29/02/2025', undefined],
    ['31 février → aucune date', '31/02/2026', undefined],
    ['mois 13 → aucune date', '12/13/2026', undefined],
    ['sans date', 'MERCI DE VOTRE VISITE', undefined],
  ]
  for (const [name, text, expected] of cases) {
    it(name, async () => {
      expect((await suggestFromText(text)).expenseDate).toBe(expected)
    })
  }

  describe('priorité entre formats : jj/mm/aaaa > ISO > jj/mm/aa > en lettres', () => {
    it('jj/mm/aaaa prime sur ISO, même placée après', async () => {
      expect((await suggestFromText(lines('2026-01-20', '12/03/2026'))).expenseDate).toBe('2026-03-12')
    })
    it('ISO prime sur le mois en lettres', async () => {
      expect((await suggestFromText(lines('5 mars 2026', '2026-01-20'))).expenseDate).toBe('2026-01-20')
    })
    it('jj/mm/aa prime sur le mois en lettres', async () => {
      expect((await suggestFromText(lines('5 mars 2026', '20/01/26'))).expenseDate).toBe('2026-01-20')
    })
    it('une date impossible fait passer au format suivant', async () => {
      expect((await suggestFromText(lines('31/02/2026', '2026-04-15'))).expenseDate).toBe('2026-04-15')
    })
  })
})

describe('OCR — cas limites (comportement actuel figé)', () => {
  // Pas des règles voulues, mais la sortie actuelle de l'application : une
  // optimisation ne doit pas la changer. Un changement volontaire se valide
  // avec la team Tests, comme un test @parity.
  it('seule la première ligne mot-clé compte (« Sous-total » avant « Total »)', async () => {
    expect((await suggestFromText(lines('Sous-total 10,00', 'Total TTC 12,00'))).amount).toBe(10)
  })
  it('ligne mot-clé sans chiffre : les montants des autres lignes sont ignorés', async () => {
    expect((await suggestFromText(lines('Total : voir ci-dessous', 'Plat 12,50'))).amount).toBeUndefined()
  })
  it('entier de plus de 5 chiffres sans centimes ignoré', async () => {
    expect((await suggestFromText('TOTAL 123456')).amount).toBeUndefined()
  })
  it('« A payer » sans accent n’est pas un mot-clé (repli sur le plus grand montant)', async () => {
    expect((await suggestFromText(lines('Acompte 50,00', 'A payer 24,00'))).amount).toBe(50)
  })
})

describe('OCR — tickets complets (textes des reçus de référence)', () => {
  it('ticket-total', async () => {
    const text = lines('RESTAURANT LE TEST', 'Date : 12/03/2026', 'Plat du jour 30,00', 'Boisson 12,50', 'TOTAL TTC 42,50 EUR')
    expect(await suggestFromText(text)).toEqual({ amount: 42.5, expenseDate: '2026-03-12' })
  })
  it('ticket-date-texte', async () => {
    const text = lines('LIBRAIRIE CENTRALE', 'Le 5 mars 2026', 'Livre 18,90', 'Montant 18,90 EUR')
    expect(await suggestFromText(text)).toEqual({ amount: 18.9, expenseDate: '2026-03-05' })
  })
  it('ticket-iso', async () => {
    const text = lines('PARKING AEROPORT', '2026-01-20', 'Duree 3 h', 'A payer 24,00 EUR')
    expect(await suggestFromText(text)).toEqual({ amount: 24, expenseDate: '2026-01-20' })
  })
  it('ticket-vide → aucune suggestion', async () => {
    expect(await suggestFromText(lines('MERCI DE VOTRE VISITE', 'A bientot'))).toEqual({})
  })
})

describe('OCR — types de fichier et robustesse', () => {
  for (const mimeType of ['image/png', 'image/jpeg', 'image/webp']) {
    it(`${mimeType} : l’image envoyée est analysée`, async () => {
      engine.recognize.mockResolvedValue({ data: { text: 'TOTAL 9,99' } })
      const data = Buffer.from(`contenu ${mimeType}`)
      expect(await suggestFields({ data, mimeType })).toEqual({ amount: 9.99 })
      expect(engine.recognize).toHaveBeenCalledTimes(1)
      expect(engine.recognize.mock.calls[0][0]).toEqual(data)
    })
  }

  for (const mimeType of ['application/pdf', 'image/gif', 'text/plain', '']) {
    it(`${mimeType || 'type vide'} → aucune suggestion, sans appel à l’OCR`, async () => {
      expect(await suggestFields({ data: Buffer.from('x'), mimeType })).toEqual({})
      expect(engine.recognize).not.toHaveBeenCalled()
    })
  }

  it('échec de la reconnaissance → aucune suggestion, pas d’exception', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    engine.recognize.mockRejectedValue(new Error('image illisible'))
    await expect(suggestFields(PNG)).resolves.toEqual({})
  })

  it('un échec de démarrage du moteur n’empêche pas les requêtes suivantes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    engine.createWorker.mockRejectedValueOnce(new Error('tessdata introuvable'))
    engine.recognize.mockResolvedValue({ data: { text: 'TOTAL 42,50' } })
    const attempts: Awaited<ReturnType<SuggestFields>>[] = []
    for (let i = 0; i < 3; i++) attempts.push(await suggestFields(PNG))
    expect(attempts.at(-1)).toEqual({ amount: 42.5 })
  })

  it('requêtes simultanées : chacune reçoit le résultat de son propre reçu', async () => {
    const texts: Record<string, string> = {
      a: lines('TOTAL 11,11', '01/01/2026'),
      b: lines('TOTAL 22,22', '02/02/2026'),
      c: 'MERCI',
    }
    engine.recognize.mockImplementation(async (image) => {
      const key = String(image)
      // Le premier reçu répond en dernier.
      await new Promise((resolve) => setTimeout(resolve, key === 'a' ? 30 : 0))
      return { data: { text: texts[key] } }
    })
    const results = await Promise.all(
      ['a', 'b', 'c'].map((key) => suggestFields({ data: Buffer.from(key), mimeType: 'image/png' }))
    )
    expect(results).toEqual([
      { amount: 11.11, expenseDate: '2026-01-01' },
      { amount: 22.22, expenseDate: '2026-02-02' },
      {},
    ])
  })
})
