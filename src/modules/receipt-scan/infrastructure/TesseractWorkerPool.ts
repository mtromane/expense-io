import os from 'node:os'
import path from 'node:path'
import { createWorker, type Worker } from 'tesseract.js'
import type { ReceiptScanner } from '../ports/ReceiptScanner'

export interface PoolOptions {
  /** Nombre maximal de workers (au-delà, les requêtes attendent leur tour). */
  size: number
  /**
   * Délai maximal de chaque étape : attente d'une place, création d'un worker,
   * reconnaissance. Au-delà, la requête échoue (suggestion vide pour
   * l'utilisateur) au lieu d'attendre indéfiniment.
   */
  timeoutMs: number
}

export const DEFAULT_POOL_OPTIONS: PoolOptions = {
  size: Math.max(1, Math.min(4, os.availableParallelism())),
  timeoutMs: 20_000,
}

class ScanTimeoutError extends Error {
  constructor(step: string, ms: number) {
    super(`${step} OCR interrompue après ${ms} ms`)
    this.name = 'ScanTimeoutError'
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, step: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ScanTimeoutError(step, ms)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/**
 * Workers Tesseract réutilisés d'une requête à l'autre (PERF-01) et bornés en
 * nombre : l'application d'origine chargeait le modèle de langue à chaque
 * requête. Un worker en erreur ou trop lent est détruit, puis recréé à la
 * demande ; un échec de création n'affecte que la requête en cours. La place
 * d'un worker détruit n'est rendue qu'une fois son arrêt confirmé : sous
 * charge, jamais plus de `size` workers vivants. Chaque étape est bornée dans
 * le temps : une création bloquée ou une file saturée fait échouer la requête
 * au lieu de la suspendre.
 *
 * Compromis assumés (revues de la PR #6) :
 * - la suggestion n'est qu'un pré-remplissage : au-delà de `timeoutMs`
 *   d'attente d'une place, mieux vaut une suggestion vide qu'un formulaire
 *   bloqué (une requête dure au plus 3 × `timeoutMs` : attente, création,
 *   reconnaissance) ;
 * - une création qui ne se termine jamais garde sa place : le nombre de
 *   workers reste borné (pas d'accumulation de créations bloquées), au prix
 *   de suggestions vides tant que le moteur ne répond plus. Une création qui
 *   aboutit en retard rend sa place, après arrêt du worker.
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
    const worker = this.idle.pop() ?? (await this.startWorker()) // en cas d'échec, startWorker rend la place
    try {
      const result = await withTimeout(worker.recognize(image), this.options.timeoutMs, 'Reconnaissance')
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

  /**
   * Création bornée dans le temps. Si elle échoue ou expire, l'appelant reçoit
   * l'erreur tout de suite ; la place n'est rendue qu'une fois la création
   * terminée (un worker arrivé en retard est arrêté aussitôt).
   */
  private async startWorker(): Promise<Worker> {
    const creation = this.createWorker()
    try {
      return await withTimeout(creation, this.options.timeoutMs, 'Création du worker')
    } catch (error) {
      void creation
        .then((late) => late.terminate())
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
    return new Promise((resolve, reject) => {
      const grant = () => {
        clearTimeout(timer)
        resolve()
      }
      const timer = setTimeout(() => {
        const index = this.waiting.indexOf(grant)
        if (index >= 0) this.waiting.splice(index, 1)
        reject(new ScanTimeoutError("Attente d'une place", this.options.timeoutMs))
      }, this.options.timeoutMs)
      this.waiting.push(grant)
    })
  }

  private release(): void {
    const next = this.waiting.shift()
    if (next) next()
    else this.freeSlots++
  }
}
