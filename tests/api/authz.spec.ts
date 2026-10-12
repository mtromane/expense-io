import { expect, test, type APIRequestContext } from '@playwright/test'
import { actor } from '../support/actors'
import { anonymous, loginAs } from '../support/auth'
import { receipt, type ReceiptFile } from '../support/files'
import { createNote, uniqueDescription } from '../support/notes'
import { expectDefect } from '../defects/registry'
import { AUTHZ_MATRIX, MATRIX_ACTORS, type MatrixActor, type MatrixRow } from './authz-matrix'

const contexts = new Map<MatrixActor, APIRequestContext>()

test.beforeAll(async () => {
  contexts.set('anonymous', await anonymous())
  for (const [column, key] of Object.entries(MATRIX_ACTORS)) {
    contexts.set(column as MatrixActor, await loginAs(key))
  }
})
test.afterAll(async () => {
  await Promise.all([...contexts.values()].map((c) => c.dispose()))
})

async function resolveId(row: MatrixRow): Promise<string | null> {
  switch (row.target) {
    case 'employeeNote':
      return (await createNote(contexts.get('owner')!)).id
    case 'rootManagerNote':
      return (await createNote(contexts.get('otherManager')!)).id // otherManager = rootMgrA
    case 'userEmpA2':
      return actor('empA2').id
    case 'none':
      return null
  }
}

function requestOptions(row: MatrixRow): { multipart?: Record<string, string | ReceiptFile>; data?: unknown } {
  switch (row.body) {
    case 'note':
      return {
        multipart: { amount: '12.00', expenseDate: '2026-03-12', description: uniqueDescription('Matrice'), receipt: receipt() },
      }
    case 'pdfReceipt':
      return { multipart: { receipt: receipt('pdf') } }
    case 'sameManager':
      return { data: { managerId: actor('subMgrA').id } }
    case 'none':
      return {}
  }
}

for (const row of AUTHZ_MATRIX) {
  for (const [column, cell] of Object.entries(row.expected) as [MatrixActor, MatrixRow['expected'][MatrixActor]][]) {
    const { status, defect } = typeof cell === 'number' ? { status: cell, defect: undefined } : cell
    const tag = defect ? ['@defect', `@${defect}`] : ['@parity']
    test(`AUTHZ ${row.id} ${row.method} ${row.path} — ${column} → ${status}`, { tag }, async () => {
      if (defect) expectDefect(defect)
      const id = await resolveId(row)
      const url = id ? row.path.replace(':id', id) : row.path
      const res = await contexts.get(column)!.fetch(url, { method: row.method, ...requestOptions(row) })
      expect(res.status()).toBe(status)
    })
  }
}
