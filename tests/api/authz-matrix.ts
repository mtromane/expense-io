import type { ActorKey } from '../support/actors'
import type { DefectId } from '../defects/registry'

export type MatrixActor =
  | 'anonymous'
  | 'owner'
  | 'otherEmployee'
  | 'directManager'
  | 'otherManager'
  | 'hr'
  | 'otherHr'

/** Acteurs du dataset derrière chaque colonne. otherManager = N+2 de l'owner. */
export const MATRIX_ACTORS: Record<Exclude<MatrixActor, 'anonymous'>, ActorKey> = {
  owner: 'empA1',
  otherEmployee: 'empA2',
  directManager: 'subMgrA',
  otherManager: 'rootMgrA',
  hr: 'hrA',
  otherHr: 'hrB',
}

/** Ressource ciblée par `:id` : note fraîche de l'owner, note fraîche du manager racine, ou empA2. */
export type MatrixTarget = 'none' | 'employeeNote' | 'rootManagerNote' | 'userEmpA2'
export type MatrixBody = 'none' | 'note' | 'pdfReceipt' | 'sameManager'

export interface Expected {
  status: number
  /** Cellule dont le comportement actuel est un défaut : `status` = attendu après correction. */
  defect?: DefectId
}

export interface MatrixRow {
  id: string
  method: 'GET' | 'POST' | 'PUT'
  path: string
  target: MatrixTarget
  body: MatrixBody
  expected: Record<MatrixActor, number | Expected>
}

const anyLogged = (status: number) => ({
  owner: status, otherEmployee: status, directManager: status, otherManager: status, hr: status, otherHr: status,
})

export const AUTHZ_MATRIX: MatrixRow[] = [
  { id: 'E01', method: 'GET', path: '/api/expense-notes', target: 'none', body: 'none',
    expected: { anonymous: 401, ...anyLogged(200) } },
  { id: 'E02', method: 'POST', path: '/api/expense-notes', target: 'none', body: 'note',
    expected: { anonymous: 401, ...anyLogged(201) } },
  { id: 'E03', method: 'GET', path: '/api/expense-notes/:id/receipt-url', target: 'employeeNote', body: 'none',
    expected: { anonymous: 401, owner: 200, otherEmployee: 404, directManager: 404, otherManager: 404, hr: 404, otherHr: 404 } },
  { id: 'E04', method: 'POST', path: '/api/expense-notes/receipt-suggestion', target: 'none', body: 'pdfReceipt',
    expected: { anonymous: 401, ...anyLogged(200) } },
  { id: 'M01', method: 'GET', path: '/api/manager/expense-notes', target: 'none', body: 'none',
    expected: { anonymous: 401, owner: 401, otherEmployee: 401, directManager: 200, otherManager: 200, hr: 401, otherHr: 401 } },
  { id: 'M02', method: 'POST', path: '/api/manager/expense-notes/:id/approve', target: 'employeeNote', body: 'none',
    expected: { anonymous: 401, owner: 401, otherEmployee: 401, directManager: 200, otherManager: 404, hr: 401, otherHr: 401 } },
  { id: 'M03', method: 'POST', path: '/api/manager/expense-notes/:id/reject', target: 'employeeNote', body: 'none',
    expected: { anonymous: 401, owner: 401, otherEmployee: 401, directManager: 200, otherManager: 404, hr: 401, otherHr: 401 } },
  { id: 'M04', method: 'GET', path: '/api/manager/expense-notes/:id/receipt-url', target: 'employeeNote', body: 'none',
    expected: { anonymous: 401, owner: 401, otherEmployee: 401, directManager: 200,
      otherManager: { status: 404, defect: 'SEC-02' }, hr: 401, otherHr: 401 } },
  { id: 'H01', method: 'GET', path: '/api/hr/expense-notes', target: 'none', body: 'none',
    expected: { anonymous: 403, owner: 403, otherEmployee: 403, directManager: 403, otherManager: 403, hr: 200, otherHr: 200 } },
  { id: 'H02', method: 'POST', path: '/api/hr/expense-notes/:id/approve', target: 'rootManagerNote', body: 'none',
    expected: { anonymous: 403, owner: 403, otherEmployee: 403, directManager: 403, otherManager: 403, hr: 200, otherHr: 404 } },
  { id: 'H03', method: 'POST', path: '/api/hr/expense-notes/:id/reject', target: 'rootManagerNote', body: 'none',
    expected: { anonymous: 403, owner: 403, otherEmployee: 403, directManager: 403, otherManager: 403, hr: 200, otherHr: 404 } },
  { id: 'H04', method: 'GET', path: '/api/hr/expense-notes/:id/receipt-url', target: 'rootManagerNote', body: 'none',
    expected: { anonymous: 403, owner: 403, otherEmployee: 403, directManager: 403, otherManager: 403, hr: 200, otherHr: 404 } },
  { id: 'H05', method: 'GET', path: '/api/hr/users', target: 'none', body: 'none',
    expected: { anonymous: 403, owner: 403, otherEmployee: 403, directManager: 403, otherManager: 403, hr: 200, otherHr: 200 } },
  { id: 'H06', method: 'PUT', path: '/api/hr/users/:id/manager', target: 'userEmpA2', body: 'sameManager',
    expected: { anonymous: 403, owner: 403, otherEmployee: 403, directManager: 403, otherManager: 403, hr: 200, otherHr: 404 } },
]
