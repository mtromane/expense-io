import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Actor, Identified } from '@/modules/shared/domain'
import { ConflictError, InvalidInputError, NotFoundError } from '@/modules/shared/domain'
import { ExpenseNote } from '@/domain/ExpenseNote'

/**
 * Garde HTTP commune (shared/http) : session et rôle, identifiant d'URL
 * validé, erreurs traduites sans fuite (SEC-05, ROB-03a), corrélation par
 * x-request-id ; presenter du contrat. L'acteur de la session est simulé :
 * ni Auth.js, ni base.
 */

const session = vi.hoisted(() => ({ actor: null as Actor | null }))
// getActor : rôle relu en base (routes à rôle) ; getSessionActor : jeton seul (routes sans rôle).
const identity = vi.hoisted(() => ({ getActor: 0, getSessionActor: 0 }))
vi.mock('@/modules/identity', () => ({
  getActor: async () => (identity.getActor++, session.actor),
  getSessionActor: async () => (identity.getSessionActor++, session.actor),
}))

const { route, presentExpenseNote, readReceiptForm, INTERNAL_ERROR_MESSAGE } = await import('@/modules/shared/http')

const EMPLOYEE: Actor = { id: 'u-emp', role: 'employee' }
const MANAGER: Actor = { id: 'u-mgr', role: 'manager' }
const NOTE_ID = '0b9f6a3e-6a4c-4f7e-9d61-2f3c8b1a7e55'

function call<P extends Record<string, string>>(handler: ReturnType<typeof route<P>>, params: P, headers: HeadersInit = {}) {
  return handler(new Request('http://localhost:3000/api/test', { headers }), { params: Promise.resolve(params) })
}

function okHandler() {
  return vi.fn(async ({ actor }: { actor: Identified }) => Response.json({ actor }))
}

beforeEach(() => {
  session.actor = null
  identity.getActor = 0
  identity.getSessionActor = 0
})

describe('route() : session et rôle', () => {
  it('sans session → 401, avec ou sans rôle exigé, handler jamais appelé (D12)', async () => {
    const handler = okHandler()
    for (const guarded of [route({}, handler), route({ role: 'manager' }, handler), route({ role: 'hr_admin' }, handler)]) {
      const response = await call(guarded, {})
      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({ error: 'Unauthorized' })
    }
    expect(handler).not.toHaveBeenCalled()
  })

  it('session sans le rôle exigé → 403, handler jamais appelé (D12)', async () => {
    session.actor = EMPLOYEE
    const handler = okHandler()
    for (const role of ['manager', 'hr_admin'] as const) {
      const response = await call(route({ role }, handler), {})
      expect(response.status).toBe(403)
      expect(await response.json()).toEqual({ error: 'Unauthorized' })
    }
    expect(handler).not.toHaveBeenCalled()
  })

  it('bon rôle → handler appelé avec l’acteur de la session', async () => {
    session.actor = MANAGER
    const response = await call(route({ role: 'manager' }, okHandler()), {})
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ actor: MANAGER })
  })

  it('sans rôle exigé → toute session passe, sans relire le rôle en base', async () => {
    session.actor = EMPLOYEE
    expect((await call(route({}, okHandler()), {})).status).toBe(200)
    expect(identity).toEqual({ getActor: 0, getSessionActor: 1 })
  })

  it('sans rôle exigé → le handler ne reçoit que l’identifiant (pas de rôle périmé)', async () => {
    session.actor = { id: EMPLOYEE.id } as Actor // ce que renvoie getSessionActor
    const response = await call(route({}, okHandler()), {})
    expect(await response.json()).toEqual({ actor: { id: EMPLOYEE.id } })
  })

  it('rôle exigé → rôle relu en base (ROLE-03)', async () => {
    session.actor = MANAGER
    await call(route({ role: 'manager' }, okHandler()), {})
    expect(identity).toEqual({ getActor: 1, getSessionActor: 0 })
  })
})

describe('route() : identifiant d’URL (ROB-03a)', () => {
  it('id qui n’est pas un UUID → 404 Not found, handler jamais appelé', async () => {
    session.actor = MANAGER
    const handler = okHandler()
    for (const id of ['abc', '1', `${NOTE_ID}x`, "' OR 1=1 --"]) {
      const response = await call(route<{ id: string }>({}, handler), { id })
      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({ error: 'Not found' })
    }
    expect(handler).not.toHaveBeenCalled()
  })

  it('UUID valide → transmis au handler', async () => {
    session.actor = MANAGER
    const handler = vi.fn(async ({ params }: { params: { id: string } }) => Response.json(params))
    const response = await call(route<{ id: string }>({}, handler), { id: NOTE_ID })
    expect(await response.json()).toEqual({ id: NOTE_ID })
  })
})

describe('route() : erreurs traduites', () => {
  const cases = [
    ['NotFoundError', new NotFoundError(), 404, 'Not found'],
    ['ConflictError', new ConflictError('Already decided'), 409, 'Already decided'],
    ['InvalidInputError', new InvalidInputError(), 400, 'Invalid fields'],
    ['InvalidInputError avec message', new InvalidInputError('File too large'), 400, 'File too large'],
  ] as const
  for (const [name, error, status, message] of cases) {
    it(`${name} → ${status} { error: "${message}" }`, async () => {
      session.actor = EMPLOYEE
      const response = await call(route({}, async () => { throw error }), {})
      expect(response.status).toBe(status)
      expect(await response.json()).toEqual({ error: message })
    })
  }

  it('erreur inattendue → 500 générique, ni stack ni chemin dans la réponse (SEC-05)', async () => {
    session.actor = EMPLOYEE
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await call(
      route({}, async () => {
        throw new Error('relation "expense_notes" does not exist at /app/src/x.ts:12')
      }),
      {}
    )
    expect(response.status).toBe(500)
    const body = await response.text()
    expect(JSON.parse(body)).toEqual({ error: INTERNAL_ERROR_MESSAGE })
    expect(body).not.toMatch(/stack|expense_notes|\.ts/)
    expect(logged).toHaveBeenCalled()
  })
})

describe('route() : corrélation', () => {
  it('reprend un x-request-id valide, y compris sur une erreur', async () => {
    session.actor = EMPLOYEE
    const ok = await call(route({}, okHandler()), {}, { 'x-request-id': 'req-42' })
    expect(ok.headers.get('x-request-id')).toBe('req-42')
    const failed = await call(route({}, async () => { throw new NotFoundError() }), {}, { 'x-request-id': 'req-43' })
    expect(failed.headers.get('x-request-id')).toBe('req-43')
  })

  it('en génère un si l’en-tête est absent ou invalide', async () => {
    session.actor = EMPLOYEE
    for (const headers of [{}, { 'x-request-id': 'a b<script>' }] as HeadersInit[]) {
      const response = await call(route({}, okHandler()), {}, headers)
      expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
    }
  })
})

describe('presentExpenseNote', () => {
  const props = {
    id: NOTE_ID,
    userId: 'u-emp',
    amount: 42.5,
    expenseDate: '2026-03-12',
    description: 'Taxi',
    receiptKey: 'receipts/abc.png',
    status: 'pending' as const,
  }

  it('exactement les champs du contrat, dans leur type', () => {
    const dto = presentExpenseNote(new ExpenseNote({ ...props, createdAt: '2026-03-12T10:00:00.000Z' }))
    expect(dto).toEqual({ ...props, createdAt: '2026-03-12T10:00:00.000Z' })
    expect(Object.keys(dto).sort()).toEqual(
      ['amount', 'createdAt', 'description', 'expenseDate', 'id', 'receiptKey', 'status', 'userId']
    )
  })

  it('note sans date de création : refusée plutôt que hors contrat', () => {
    expect(() => presentExpenseNote(new ExpenseNote(props))).toThrow()
  })
})

describe('readReceiptForm (SEC-08)', () => {
  const LIMIT = 10 * 1024 * 1024 + 64 * 1024
  const CHUNK = 1024 * 1024

  /** Corps envoyé en flux (Transfer-Encoding: chunked) : pas de Content-Length. */
  function streamed(totalBytes: number) {
    let sent = 0
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent >= totalBytes) return controller.close()
        const size = Math.min(CHUNK, totalBytes - sent)
        sent += size
        controller.enqueue(new Uint8Array(size))
      },
    }, { highWaterMark: 0 }) // aucun morceau produit tant que le lecteur ne le demande pas
    const request = new Request('http://localhost:3000/api/expense-notes', {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=x' },
      body,
      duplex: 'half',
    } as RequestInit)
    return { request, sent: () => sent }
  }

  it('corps sans Content-Length plus gros que la limite → File too large, sans lire tout le flux', async () => {
    const { request, sent } = streamed(200 * CHUNK)
    expect(request.headers.get('content-length')).toBeNull()
    await expect(readReceiptForm(request)).rejects.toEqual(new InvalidInputError('File too large'))
    expect(sent()).toBeLessThanOrEqual(LIMIT + 2 * CHUNK)
  })

  it('Content-Length au-delà de la limite → refusé avant toute lecture', async () => {
    const { request } = streamed(CHUNK)
    const declared = new Request(request, { headers: { 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(LIMIT + 1) } })
    await expect(readReceiptForm(declared)).rejects.toEqual(new InvalidInputError('File too large'))
    expect(declared.bodyUsed).toBe(false) // corps jamais consommé
  })

  it('formulaire normal → champs et fichier relus', async () => {
    const form = new FormData()
    form.set('amount', '12.50')
    form.set('receipt', new File([new Uint8Array([1, 2, 3])], 'r.png', { type: 'image/png' }))
    const parsed = await readReceiptForm(new Request('http://localhost:3000/api/expense-notes', { method: 'POST', body: form }))
    expect(parsed.get('amount')).toBe('12.50')
    expect((parsed.get('receipt') as File).size).toBe(3)
  })
})
