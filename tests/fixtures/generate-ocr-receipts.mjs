// Génère des reçus lisibles par l'OCR (texte noir sur fond blanc, grande
// police) pour les tests de référence de la suggestion OCR. Les fichiers sont
// commités : les tests comparent la sortie de l'OCR sur ces entrées fixes.
//   node tests/fixtures/generate-ocr-receipts.mjs           # fichiers manquants seulement
//   node tests/fixtures/generate-ocr-receipts.mjs --force   # tout régénérer
// Sans --force, un reçu existant n'est jamais réécrit : le rendu (polices,
// version de Chromium) varie d'un poste à l'autre et changerait l'image, donc
// potentiellement sa référence.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const RECEIPTS = {
  'ticket-total': ['RESTAURANT LE TEST', 'Date : 12/03/2026', 'Plat du jour 30,00', 'Boisson 12,50', 'TOTAL TTC 42,50 EUR'],
  'ticket-date-texte': ['LIBRAIRIE CENTRALE', 'Le 5 mars 2026', 'Livre 18,90', 'Montant 18,90 EUR'],
  'ticket-iso': ['PARKING AEROPORT', '2026-01-20', 'Duree 3 h', 'A payer 24,00 EUR'],
  'ticket-vide': ['MERCI DE VOTRE VISITE', 'A bientot'],
  // Montant sans date, date sans montant : suggestion partielle.
  'ticket-montant-seul': ['CAFE DE LA GARE', 'Expresso 2,50', 'TOTAL 15,00 EUR'],
  'ticket-date-seule': ['MUSEE DES ARTS', 'Le 14 février 2026', 'Merci de votre visite'],
  // Séparateur de milliers, année sur deux chiffres, montant sans centimes.
  'ticket-milliers': ['GARAGE CENTRAL', 'Date 03/11/2025', 'Pieces 1 050,00', 'TOTAL TTC 1 234,56 EUR'],
  'ticket-annee-courte': ['BOULANGERIE', '07/09/26', 'Montant 6,80 EUR'],
  'ticket-sans-centimes': ['TAXI PARISIEN', 'Course du 02/02/2026', 'A payer 35 EUR'],
}

// Formats supplémentaires (le PNG est toujours produit).
const EXTRA_FORMATS = {
  'ticket-total': ['jpg', 'webp'],
}

const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }
const force = process.argv.includes('--force')

const out = new URL('./ocr/', import.meta.url)
mkdirSync(out, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage()
for (const [name, lines] of Object.entries(RECEIPTS)) {
  const formats = ['png', ...(EXTRA_FORMATS[name] ?? [])].filter(
    (format) => force || !existsSync(new URL(`${name}.${format}`, out))
  )
  if (formats.length === 0) continue
  const dataUrls = await page.evaluate(
    ({ textLines, mimeTypes }) => {
      const canvas = document.createElement('canvas')
      canvas.width = 900
      canvas.height = 120 + textLines.length * 90
      const g = canvas.getContext('2d')
      g.fillStyle = '#ffffff'
      g.fillRect(0, 0, canvas.width, canvas.height)
      g.fillStyle = '#000000'
      g.font = '48px "Courier New", monospace'
      textLines.forEach((line, i) => g.fillText(line, 50, 100 + i * 90))
      return mimeTypes.map((mimeType) => canvas.toDataURL(mimeType, 0.95))
    },
    { textLines: lines, mimeTypes: formats.map((format) => MIME[format]) }
  )
  formats.forEach((format, i) => {
    writeFileSync(new URL(`${name}.${format}`, out), Buffer.from(dataUrls[i].split(',')[1], 'base64'))
    console.log(`  ${name}.${format}`)
  })
}
await browser.close()
console.log('Reçus OCR générés dans tests/fixtures/ocr/')
