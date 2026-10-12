// Génère des reçus de test réels (pas de simples octets) : ils resteront
// valides si l'application contrôle un jour le contenu des fichiers.
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const out = new URL('./receipts/', import.meta.url)
mkdirSync(out, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage()
const dataUrls = await page.evaluate(() => {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 32
  const g = canvas.getContext('2d')
  g.fillStyle = '#fff'
  g.fillRect(0, 0, 64, 32)
  g.fillStyle = '#000'
  g.font = '12px sans-serif'
  g.fillText('42,50', 4, 20)
  return {
    png: canvas.toDataURL('image/png'),
    jpg: canvas.toDataURL('image/jpeg', 0.9),
    webp: canvas.toDataURL('image/webp', 0.9),
  }
})
await browser.close()

for (const [ext, url] of Object.entries(dataUrls)) {
  writeFileSync(new URL(`receipt.${ext}`, out), Buffer.from(url.split(',')[1], 'base64'))
}
writeFileSync(
  new URL('receipt.gif', out),
  Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
)
writeFileSync(
  new URL('receipt.pdf', out),
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n'
)
console.log('Reçus générés dans tests/fixtures/receipts/')
