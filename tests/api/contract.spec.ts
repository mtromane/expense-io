import { expect, test } from '@playwright/test'
import { CONTRACT_OPERATIONS, validateResponse } from '../support/contract'

// Le contrat (docs/api/openapi.yaml) est vérifié sur CHAQUE réponse des tests
// d'API (tests/support/auth.ts) ; ces tests-ci vérifient le contrat lui-même
// et le validateur.

const EXPECTED_OPERATIONS = [
  'GET /api/expense-notes',
  'POST /api/expense-notes',
  'GET /api/expense-notes/{id}/receipt-url',
  'POST /api/expense-notes/receipt-suggestion',
  'GET /api/manager/expense-notes',
  'POST /api/manager/expense-notes/{id}/approve',
  'POST /api/manager/expense-notes/{id}/reject',
  'GET /api/manager/expense-notes/{id}/receipt-url',
  'GET /api/hr/expense-notes',
  'POST /api/hr/expense-notes/{id}/approve',
  'POST /api/hr/expense-notes/{id}/reject',
  'GET /api/hr/expense-notes/{id}/receipt-url',
  'GET /api/hr/users',
  'PUT /api/hr/users/{id}/manager',
  // Ajouts décidés le 2026-10-26 : D14 (changement de rôle), D13 (fiche de la RH).
  'PUT /api/hr/users/{id}/role',
  'GET /api/hr/me',
]

const NOTE = {
  id: '4b0c4a39-6a3e-4e6b-9a54-0d5f8a4f1a11',
  userId: '9d6f2c11-3b7a-4c55-8e2d-6a1b0c9f7e22',
  amount: 42.5,
  expenseDate: '2026-03-12',
  description: 'Taxi aéroport',
  receiptKey: 'receipts/1.png',
  status: 'pending',
  createdAt: '2026-10-12T10:00:00.000Z',
}

test.describe('Contrat OpenAPI (docs/api/openapi.yaml)', { tag: '@parity' }, () => {
  test('les 16 endpoints sont décrits, ni plus ni moins', () => {
    expect([...CONTRACT_OPERATIONS].sort()).toEqual([...EXPECTED_OPERATIONS].sort())
  })

  test('une réponse conforme est acceptée', () => {
    expect(validateResponse('GET', '/api/expense-notes', 200, [NOTE])).toEqual([])
  })

  test('un champ en trop est refusé', () => {
    expect(validateResponse('GET', '/api/expense-notes', 200, [{ ...NOTE, extra: true }])).not.toEqual([])
  })

  test('un champ mal typé ou manquant est refusé', () => {
    expect(validateResponse('GET', '/api/expense-notes', 200, [{ ...NOTE, amount: '42.5' }])).not.toEqual([])
    const withoutStatus: Record<string, unknown> = { ...NOTE }
    delete withoutStatus.status
    expect(validateResponse('GET', '/api/expense-notes', 200, [withoutStatus])).not.toEqual([])
  })

  test('une erreur qui expose une stack trace est refusée', () => {
    expect(validateResponse('POST', '/api/expense-notes', 500, { error: 'boom', stack: 'Error: boom' })).not.toEqual([])
  })

  test('un statut non documenté est refusé', () => {
    expect(validateResponse('GET', '/api/hr/users', 418, {})).not.toEqual([])
  })

  test('un chemin réel est rapproché de son modèle', () => {
    expect(validateResponse('POST', '/api/manager/expense-notes/abc/approve', 409, { error: 'Already decided' })).toEqual([])
  })

  test('une opération inconnue est refusée', () => {
    expect(validateResponse('DELETE', '/api/expense-notes', 200, [])).not.toEqual([])
  })
})
