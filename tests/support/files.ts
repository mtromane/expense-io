import { readFileSync } from 'node:fs'
import path from 'node:path'

export interface ReceiptFile {
  name: string
  mimeType: string
  buffer: Buffer
}

const KINDS = {
  png: { file: 'receipt.png', mimeType: 'image/png' },
  jpg: { file: 'receipt.jpg', mimeType: 'image/jpeg' },
  webp: { file: 'receipt.webp', mimeType: 'image/webp' },
  gif: { file: 'receipt.gif', mimeType: 'image/gif' },
  pdf: { file: 'receipt.pdf', mimeType: 'application/pdf' },
} as const

export type ReceiptKind = keyof typeof KINDS

export function receipt(kind: ReceiptKind = 'png'): ReceiptFile {
  const { file, mimeType } = KINDS[kind]
  return {
    name: file,
    mimeType,
    buffer: readFileSync(path.join(process.cwd(), 'tests/fixtures/receipts', file)),
  }
}

/** PNG réel complété par des zéros jusqu'à la taille exacte demandée. */
export function paddedPng(totalBytes: number): ReceiptFile {
  const base = receipt('png').buffer
  const buffer = Buffer.alloc(totalBytes)
  base.copy(buffer)
  return { name: 'big.png', mimeType: 'image/png', buffer }
}
