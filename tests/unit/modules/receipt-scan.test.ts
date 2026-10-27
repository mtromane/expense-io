import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InvalidInputError } from '@/modules/shared/domain'

/**
 * Module receipt-scan : pool de workers Tesseract (PERF-01) et limite de
 * taille vérifiée avant lecture (SEC-08). Tesseract est simulé.
 */

const engine = vi.hoisted(() => {
  const state = { running: 0, maxRunning: 0, delayMs: 5, live: 0, maxLive: 0, terminateDelayMs: 0 }
  const recognize = vi.fn(async () => {
    state.running++
    state.maxRunning = Math.max(state.maxRunning, state.running)
    await new Promise((resolve) => setTimeout(resolve, state.delayMs))
    state.running--
    return { data: { text: 'TOTAL 12,50' } }
  })
  // Un worker reste vivant tant que terminate() n'a pas abouti.
  const terminate = vi.fn(async () => {
    await new Promise((resolve) => setTimeout(resolve, state.terminateDelayMs))
    state.live--
  })
  const createWorker = vi.fn(async () => {
    state.live++
    state.maxLive = Math.max(state.maxLive, state.live)
    return { recognize, terminate }
  })
  return { state, recognize, terminate, createWorker }
})

vi.mock('tesseract.js', () => ({ createWorker: engine.createWorker, default: { createWorker: engine.createWorker } }))

const { TesseractWorkerPool } = await import('@/modules/receipt-scan/infrastructure/TesseractWorkerPool')
const { makeSuggestFromReceipt } = await import('@/modules/receipt-scan/application/suggestFromReceipt')

beforeEach(() => {
  engine.createWorker.mockClear()
  engine.terminate.mockClear()
  engine.state.maxRunning = 0
  engine.state.delayMs = 5
  engine.state.live = 0
  engine.state.maxLive = 0
  engine.state.terminateDelayMs = 0
})

describe('TesseractWorkerPool', () => {
  it('réutilise le worker d’une requête à l’autre', async () => {
    const pool = new TesseractWorkerPool({ size: 2, timeoutMs: 1_000 })
    for (let i = 0; i < 5; i++) expect(await pool.recognizeText(Buffer.from('img'))).toBe('TOTAL 12,50')
    expect(engine.createWorker).toHaveBeenCalledTimes(1)
  })

  it('jamais plus de reconnaissances simultanées que la taille du pool', async () => {
    const pool = new TesseractWorkerPool({ size: 2, timeoutMs: 1_000 })
    await Promise.all(Array.from({ length: 6 }, () => pool.recognizeText(Buffer.from('img'))))
    expect(engine.state.maxRunning).toBe(2)
    expect(engine.createWorker).toHaveBeenCalledTimes(2)
  })

  it('reconnaissance trop longue : erreur, worker détruit puis remplacé', async () => {
    const pool = new TesseractWorkerPool({ size: 1, timeoutMs: 20 })
    engine.state.delayMs = 100
    await expect(pool.recognizeText(Buffer.from('img'))).rejects.toThrow(/interrompue/)
    expect(engine.terminate).toHaveBeenCalledTimes(1)
    engine.state.delayMs = 5
    expect(await pool.recognizeText(Buffer.from('img'))).toBe('TOTAL 12,50')
    expect(engine.createWorker).toHaveBeenCalledTimes(2)
  })

  it('délai dépassé : la place n’est rendue qu’une fois le worker arrêté (jamais plus de workers vivants que la taille)', async () => {
    const pool = new TesseractWorkerPool({ size: 1, timeoutMs: 20 })
    engine.state.delayMs = 100
    engine.state.terminateDelayMs = 50
    const first = pool.recognizeText(Buffer.from('img'))
    const second = pool.recognizeText(Buffer.from('img'))
    await expect(first).rejects.toThrow(/interrompue/)
    await expect(second).rejects.toThrow(/interrompue/)
    expect(engine.state.maxLive).toBe(1)
  })
})

describe('suggestFromReceipt', () => {
  const scanner = { recognizeText: vi.fn(async () => 'TOTAL 12,50\n12/03/2026') }

  it('fichier de plus de 10 Mo : refusé sans être lu (SEC-08)', async () => {
    const read = vi.fn()
    await expect(
      makeSuggestFromReceipt({ scanner })({ declaredType: 'image/png', size: 10 * 1024 * 1024 + 1, read })
    ).rejects.toEqual(new InvalidInputError('File too large'))
    expect(read).not.toHaveBeenCalled()
  })

  it('reçu absent → Invalid fields', async () => {
    await expect(makeSuggestFromReceipt({ scanner })(null)).rejects.toEqual(new InvalidInputError('Invalid fields'))
  })

  it('image lisible → montant et date', async () => {
    const suggestion = await makeSuggestFromReceipt({ scanner })({
      declaredType: 'image/png',
      size: 3,
      read: async () => new Uint8Array([1, 2, 3]),
    })
    expect(suggestion).toEqual({ amount: 12.5, expenseDate: '2026-03-12' })
  })
})
