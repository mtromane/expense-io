import os from 'node:os'
import path from 'node:path'
import { createWorker, type Worker } from 'tesseract.js'
import type { ReceiptScanner } from '../ports/ReceiptScanner'

export interface PoolOptions {
  /** Nombre maximal de workers (au-delà, les requêtes attendent leur tour). */
  size: number
  /** Délai maximal d'une reconnaissance ; au-delà, le worker est détruit. */
  timeoutMs: number
}

export const DEFAULT_POOL_OPTIONS: PoolOptions = {
  size: Math.max(1, Math.min(4, os.availableParallelism())),
  timeoutMs: 20_000,
}

class ScanTimeoutError extends Error {
  constructor(ms: number) {
    super(`Reconnaissance OCR interrompue après ${ms} ms`)
    this.name = 'ScanTimeoutError'
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ScanTimeoutError(ms)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/**
 * Workers Tesseract réutilisés d'une requête à l'autre (PERF-01) et bornés en
 * nombre : l'application d'origine chargeait le modèle de langue à chaque
 * requête. Un worker en erreur ou trop lent est détruit, puis recréé à la
 * demande ; un échec de création n'affecte que la requête en cours. La place
 * d'un worker détruit n'est rendue qu'une fois son arrêt confirmé : sous
 * charge, jamais plus de `size` workers vivants.
 */
export class TesseractWorkerPool implements ReceiptScanner {
  private readonly idle: Worker[] = []
  private readonly waiting: (() => void)[] = []
  private freeSlots: number

  constructor(private readonly options: PoolOptions = DEFAULT_POOL_OPTIONS) {
    this.freeSlots = options.size
  }

  async recognizeText(image: Buffer): Promise<string> {
    await this.acquire()
    let worker: Worker
    try {
      worker = this.idle.pop() ?? (await this.createWorker())
    } catch (error) {
      this.release()
      throw error
    }
    try {
      const result = await withTimeout(worker.recognize(image), this.options.timeoutMs)
      this.idle.push(worker)
      this.release()
      return result.data.text
    } catch (error) {
      // L'appelant reçoit l'erreur tout de suite ; la place attend l'arrêt effectif du worker.
      void worker
        .terminate()
        .catch(() => undefined)
        .finally(() => this.release())
      throw error
    }
  }

  private createWorker(): Promise<Worker> {
    return createWorker('fra', undefined, {
      langPath: path.join(process.cwd(), 'tessdata'),
      cacheMethod: 'none',
    })
  }

  private acquire(): Promise<void> {
    if (this.freeSlots > 0) {
      this.freeSlots--
      return Promise.resolve()
    }
    return new Promise((resolve) => this.waiting.push(resolve))
  }

  private release(): void {
    const next = this.waiting.shift()
    if (next) next()
    else this.freeSlots++
  }
}
