import { readFileSync } from 'node:fs'
import path from 'node:path'
import dataset from '../fixtures/dataset.json'

export type ActorKey =
  | 'hrA'
  | 'rootMgrA'
  | 'subMgrA'
  | 'empA1'
  | 'empA2'
  | 'empNoMgrA'
  | 'reassignSec03'
  | 'reassignRob03'
  | 'reassignE2E'
  | 'reassignHrApi'
  | 'reassignSeed'
  | 'reassignRoot'
  | 'reassignUi'
  | 'loneMgrA'
  | 'hrB'
  | 'rootMgrB'
  | 'empB'
  | 'hrC'
  | 'mgrC'
  | 'mgrC2'
  | 'empC1'
  | 'promoteC'
  | 'sessionC'
  | 'promoteUiC'
  | 'totalsC'
  | 'raceMgrC'
  | 'raceEmpC'
  | 'cycleMgrC1'
  | 'cycleMgrC2'
  | 'rootMgrC'
  | 'noMgrEmpC'
  | 'zeroAmountC'

export interface Actor {
  key: ActorKey
  id: string
  email: string
  name: string
  role: 'employee' | 'manager' | 'hr_admin'
  company: string
}

export const E2E_PASSWORD: string = dataset.password

export const SEED = {
  hr: { email: 'hr@expense.io', password: 'hr1234' },
  manager: { email: 'manager@expense.io', password: 'manager1234' },
  employee: { email: 'demo@expense.io', password: 'demo1234' },
}

let cache: Record<string, Actor> | undefined

export function actor(key: ActorKey): Actor {
  if (!cache) {
    const file = path.join(process.cwd(), 'tests/.generated/actors.json')
    try {
      cache = JSON.parse(readFileSync(file, 'utf8')) as Record<string, Actor>
    } catch {
      throw new Error(`${file} introuvable : lancer \`npm run seed:e2e\` (fait par le globalSetup).`)
    }
  }
  const found = cache[key]
  if (!found) throw new Error(`Acteur absent du dataset : ${key}`)
  return found
}
