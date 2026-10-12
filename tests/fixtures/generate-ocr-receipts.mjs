// Génère des reçus lisibles par l'OCR (texte noir sur fond blanc, grande
// police) pour les tests de référence de la suggestion OCR. Les fichiers sont
// commités : les tests comparent la sortie de l'OCR sur ces entrées fixes.
//   node tests/fixtures/generate-ocr-receipts.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const RECEIPTS = {
  'ticket-total': ['RESTAURANT LE TEST', 'Date : 12/03/2026', 'Plat du jour 30,00', 'Boisson 12,50', 'TOTAL TTC 42,50 EUR'],
  'ticket-date-texte': ['LIBRAIRIE CENTRALE', 'Le 5 mars 2026', 'Livre 18,90', 'Montant 18,90 EUR'],
  'ticket-iso': ['PARKING AEROPORT', '2026-01-20', 'Duree 3 h', 'A payer 24,00 EUR'],
  'ticket-vide': ['MERCI DE VOTRE VISITE', 'A bientot'],
}

const out = new URL('./ocr/', import.meta.url)
mkdirSync(out, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage()
for (const [name, lines] of Object.entries(RECEIPTS)) {
  const dataUrls = await page.evaluate((textLines) => {
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 120 + textLines.length * 90
    const g = canvas.getContext('2d')
    g.fillStyle = '#ffffff'
    g.fillRect(0, 0, canvas.width, canvas.height)
    g.fillStyle = '#000000'
    g.font = '48px "Courier New", monospace'
    textLines.forEach((line, i) => g.fillText(line, 50, 100 + i * 90))
    return { png: canvas.toDataURL('image/png'), jpg: canvas.toDataURL('image/jpeg', 0.95) }
  }, lines)
  writeFileSync(new URL(`${name}.png`, out), Buffer.from(dataUrls.png.split(',')[1], 'base64'))
  if (name === 'ticket-total') {
    writeFileSync(new URL(`${name}.jpg`, out), Buffer.from(dataUrls.jpg.split(',')[1], 'base64'))
  }
}
await browser.close()
console.log('Reçus OCR générés dans tests/fixtures/ocr/')
