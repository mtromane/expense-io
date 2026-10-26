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
export type MatrixBody = 'none' | 'note' | 'pdfReceipt' | 'sameManager' | 'sameRole'

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

// D12 (ADR-012) : connecté sans le rôle → 403 sur /api/manager/* (AUTHZ-01) ;
// anonyme → 401 sur /api/hr/* (AUTHZ-02).
const WRONG_ROLE_MANAGER = { status: 403, defect: 'AUTHZ-01' } as const
const ANONYMOUS_HR = { status: 401, defect: 'AUTHZ-02' } as const

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
    expected: { anonymous: 401, owner: WRONG_ROLE_MANAGER, otherEmployee: WRONG_ROLE_MANAGER, directManager: 200, otherManager: 200, hr: WRONG_ROLE_MANAGER, otherHr: WRONG_ROLE_MANAGER } },
  { id: 'M02', method: 'POST', path: '/api/manager/expense-notes/:id/approve', target: 'employeeNote', body: 'none',
    expected: { anonymous: 401, owner: WRONG_ROLE_MANAGER, otherEmployee: WRONG_ROLE_MANAGER, directManager: 200, otherManager: 404, hr: WRONG_ROLE_MANAGER, otherHr: WRONG_ROLE_MANAGER } },
  { id: 'M03', method: 'POST', path: '/api/manager/expense-notes/:id/reject', target: 'employeeNote', body: 'none',
    expected: { anonymous: 401, owner: WRONG_ROLE_MANAGER, otherEmployee: WRONG_ROLE_MANAGER, directManager: 200, otherManager: 404, hr: WRONG_ROLE_MANAGER, otherHr: WRONG_ROLE_MANAGER } },
  { id: 'M04', method: 'GET', path: '/api/manager/expense-notes/:id/receipt-url', target: 'employeeNote', body: 'none',
    expected: { anonymous: 401, owner: WRONG_ROLE_MANAGER, otherEmployee: WRONG_ROLE_MANAGER, directManager: 200,
      otherManager: { status: 404, defect: 'SEC-02' }, hr: WRONG_ROLE_MANAGER, otherHr: WRONG_ROLE_MANAGER } },
  { id: 'H01', method: 'GET', path: '/api/hr/expense-notes', target: 'none', body: 'none',
    expected: { anonymous: ANONYMOUS_HR, owner: 403, otherEmployee: 403, directManager: 403, otherManager: 403, hr: 200, otherHr: 200 } },
  { id: 'H02', method: 'POST', path: '/api/hr/expense-notes/:id/approve', target: 'rootManagerNote', body: 'none',
    expected: { anonymous: ANONYMOUS_HR, owner: 403, otherEmployee: 403, directManager: 403, otherManager: 403, hr: 200, otherHr: 404 } },
  { id: 'H03', method: 'POST', path: '/api/hr/expense-notes/:id/reject', target: 'rootManagerNote', body: 'none',
    expected: { anonymous: ANONYMOUS_HR, owner: 403, otherEmployee: 403, directManager: 403, otherManager: 403, hr: 200, otherHr: 404 } },
  { id: 'H04', method: 'GET', path: '/api/hr/expense-notes/:id/receipt-url', target: 'rootManagerNote', body: 'none',
    expected: { anonymous: ANONYMOUS_HR, owner: 403, otherEmployee: 403, directManager: 403, otherManager: 403, hr: 200, otherHr: 404 } },
  { id: 'H05', method: 'GET', path: '/api/hr/users', target: 'none', body: 'none',
    expected: { anonymous: ANONYMOUS_HR, owner: 403, otherEmployee: 403, directManager: 403, otherManager: 403, hr: 200, otherHr: 200 } },
  { id: 'H06', method: 'PUT', path: '/api/hr/users/:id/manager', target: 'userEmpA2', body: 'sameManager',
    expected: { anonymous: ANONYMOUS_HR, owner: 403, otherEmployee: 403, directManager: 403, otherManager: 403, hr: 200, otherHr: 404 } },
  // D14 (ADR-014) : nouvelle route de changement de rôle (rôle inchangé ici : aucune donnée modifiée).
  { id: 'H07', method: 'PUT', path: '/api/hr/users/:id/role', target: 'userEmpA2', body: 'sameRole',
    expected: {
      anonymous: { status: 401, defect: 'ROLE-01' },
      owner: { status: 403, defect: 'ROLE-01' }, otherEmployee: { status: 403, defect: 'ROLE-01' },
      directManager: { status: 403, defect: 'ROLE-01' }, otherManager: { status: 403, defect: 'ROLE-01' },
      hr: { status: 200, defect: 'ROLE-01' }, otherHr: { status: 404, defect: 'ROLE-01' },
    } },
  // D13 (ADR-013) : fiche de la RH courante (son manager, qui valide ses notes).
  { id: 'H08', method: 'GET', path: '/api/hr/me', target: 'none', body: 'none',
    expected: {
      anonymous: { status: 401, defect: 'MET-03' },
      owner: { status: 403, defect: 'MET-03' }, otherEmployee: { status: 403, defect: 'MET-03' },
      directManager: { status: 403, defect: 'MET-03' }, otherManager: { status: 403, defect: 'MET-03' },
      hr: { status: 200, defect: 'MET-03' }, otherHr: { status: 200, defect: 'MET-03' },
    } },
]
