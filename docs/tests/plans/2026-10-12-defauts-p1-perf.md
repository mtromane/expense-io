# Défauts P1 et performance — Plan d'implémentation (lots L3 partiel et L4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter les tests rouge → vert des défauts techniques P1 (SEC-06 à 09, ROB-01, BUG-01) et le harnais de performance A/B contre la baseline (PERF-01, PERF-02, non-régression).

**Architecture:** Les défauts P1 rejoignent le registre `tests/defects/registry.ts` et suivent la même sémantique `test.fail` que les P0. La performance est mesurée par `tests/perf/compare.mjs` : il construit la baseline (worktree) et la version courante, recrée pour chaque passage une base dédiée `expense_io_perf` peuplée par `scripts/seed-perf.mjs`, lance chaque version sur le port 3100, exécute les scénarios k6 en alternance A/B, et compare les médianes de p95. Les objectifs PERF-01/02 vivent dans `tests/perf/targets.json` avec la même logique `fixed`.

**Tech Stack:** Playwright Test, k6 0.54 (binaire ou image Docker `grafana/k6:0.54.0`), PostgreSQL 16, Node.js 24, GitHub Actions.

**Spec:** `docs/tests/specs/2026-10-12-strategie-tests-design.md` (§5.1, §8, §10)

## Global Constraints

- Branche `tests/p1-perf` ; chaque commit poussé sur `origin/tests/p1-perf`.
- Aucun fichier applicatif modifié (`src/`, `migrations/`, `scripts/seed.mjs`).
- Tout test `@defect` échoue sur la baseline (pour la bonne raison, vérifiée) ; `expectDefect()` appelé juste avant l'oracle, après la mise en place.
- SQL autorisé dans `tests/` uniquement pour SEC-09 ; `scripts/seed-perf.mjs` est le seul autre accès base.
- Perf : toujours sur build de production ; comparaison par ratio courant / baseline mesuré dans le même run ; seuil de régression 1,10 ; objectifs PERF-01/02 : ratio p95 ≤ 0,5.
- Messages de commit terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Base de perf recréée entre deux passages : aucune donnée d'un passage ne doit fausser le suivant → `compare.mjs` supprime et recrée `expense_io_perf` avant chaque démarrage (Task 4, vérifié par le comptage de notes affiché).
2. Requêtes de connexion k6 (bcrypt) dans `setup()` : elles ne doivent pas entrer dans les latences mesurées → sous-métriques `{scenario:main}` (Task 3).
3. Processus `next start` laissé vivant sur le port 3100 après un échec → arrêt du groupe de processus dans un `finally` (Task 4).
4. Objectif PERF atteint alors que `fixed: false` → échec explicite, même sémantique que les défauts Playwright (Task 4).
5. Défaut P1 qui échoue pour une mauvaise raison (setup) → `expectDefect()` après la mise en place, raisons vérifiées sur la baseline (Task 1, 2).

---

### Task 1: Défauts P1 API et base (SEC-06, 07, 08, 09, ROB-01)

**Files:**
- Modify: `tests/defects/registry.ts`
- Create: `tests/defects/p1.spec.ts`

**Interfaces:**
- Consumes: `expectDefect`, `loginAs`, `apiLogin`, `credentialsOf`, `actor`, `createNote`, `postNote`, `listOwnNotes`, `uniqueDescription`, `paddedPng`, `FAULTY_URL`.

- [ ] **Step 1: Ajouter au registre, après `'ROB-03e'`**

```ts
  'SEC-06': { title: 'Clés de reçu séquentielles et prévisibles', fixed: false },
  'SEC-07': { title: 'Type de reçu validé sur le MIME déclaré par le client', fixed: false },
  'SEC-08': { title: 'Suggestion OCR sans limite de taille', fixed: false },
  'SEC-09': { title: 'RLS inopérante (rôle de base superuser)', fixed: false },
  'ROB-01': { title: 'Création de note non atomique (S3 hors transaction)', fixed: false },
  'BUG-01': { title: 'Date affichée décalée d’un jour en fuseau négatif', fixed: false },
```

- [ ] **Step 2: Écrire `tests/defects/p1.spec.ts`**

```ts
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
import { Client } from 'pg'
import { expect, test } from '@playwright/test'
import { actor } from '../support/actors'
import { apiLogin, credentialsOf, loginAs } from '../support/auth'
import { FAULTY_URL } from '../support/env'
import { paddedPng } from '../support/files'
import { createNote, listOwnNotes, postNote, uniqueDescription } from '../support/notes'
import { expectDefect } from './registry'

loadEnv({ quiet: true })

// expectDefect() est appelé juste avant l'oracle, après la mise en place :
// un échec de setup reste un vrai échec, jamais un « échec attendu ».

test('SEC-06 les clés de reçu ne sont pas devinables', { tag: ['@defect', '@SEC-06'] }, async () => {
  const emp = await loginAs('empA1')
  const first = await createNote(emp)
  const second = await createNote(emp)
  expectDefect('SEC-06')
  for (const key of [first.receiptKey, second.receiptKey]) {
    const name = path.posix.basename(key).replace(/\.[a-z0-9]+$/i, '')
    expect(name, key).not.toMatch(/^\d+$/)
    expect(name.length, key).toBeGreaterThanOrEqual(16)
  }
  expect(first.receiptKey).not.toBe(second.receiptKey)
  await emp.dispose()
})

test('SEC-07 contenu non conforme au type déclaré → 400', { tag: ['@defect', '@SEC-07'] }, async () => {
  const emp = await loginAs('empA1')
  const fake = { name: 'faux.png', mimeType: 'image/png', buffer: Buffer.from('ceci n’est pas une image\n'.repeat(20)) }
  expectDefect('SEC-07')
  const res = await postNote(emp, { receipt: fake })
  expect(res.status()).toBe(400)
  expect(await res.json()).toEqual({ error: 'Type de fichier non autorisé pour le reçu' })
  await emp.dispose()
})

test('SEC-08 suggestion OCR : fichier de plus de 10 Mo → 400', { tag: ['@defect', '@SEC-08'] }, async () => {
  test.setTimeout(120_000)
  const emp = await loginAs('empA1')
  const big = paddedPng(10 * 1024 * 1024 + 1)
  expectDefect('SEC-08')
  const res = await emp.post('/api/expense-notes/receipt-suggestion', { multipart: { receipt: big } })
  expect(res.status()).toBe(400)
  expect(await res.json()).toEqual({ error: 'Fichier trop volumineux' })
  await emp.dispose()
})

/**
 * SEC-09 : la base isole elle-même les notes (défense en profondeur).
 * Reproduit le contexte posé par l'application (`app.current_user_id`).
 * Si l'équipe archi rend la RLS effective via un rôle dédié (`SET LOCAL ROLE`),
 * elle expose ce rôle dans `APP_DB_ROLE` ; si elle choisit de retirer la RLS,
 * ce test est supprimé avec l'accord de la team Tests (décision ADR).
 */
test('SEC-09 la base n’expose à un utilisateur que ses propres notes', { tag: ['@defect', '@SEC-09'] }, async () => {
  const me = actor('empA1').id
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [me])
    if (process.env.APP_DB_ROLE) {
      await client.query(`SET LOCAL ROLE ${client.escapeIdentifier(process.env.APP_DB_ROLE)}`)
    }
    expectDefect('SEC-09')
    const { rows } = await client.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM expense_notes WHERE user_id <> $1',
      [me]
    )
    expect(rows[0].n).toBe(0)
  } finally {
    await client.query('ROLLBACK').catch(() => undefined)
    await client.end()
  }
})

test('ROB-01 S3 indisponible → aucune note créée', { tag: ['@defect', '@ROB-01'] }, async () => {
  test.setTimeout(60_000)
  const faulty = await apiLogin(credentialsOf(actor('empA2')), FAULTY_URL)
  const main = await loginAs('empA2')
  const description = uniqueDescription('Orpheline')
  expectDefect('ROB-01')
  const res = await postNote(faulty, { description })
  expect(res.status()).toBeGreaterThanOrEqual(500)
  const notes = await listOwnNotes(main)
  expect(notes.filter((n) => n.description === description)).toEqual([])
  await Promise.all([faulty.dispose(), main.dispose()])
})
```

- [ ] **Step 3: Lancer sur la baseline et vérifier les raisons d'échec**

Run: `npx playwright test tests/defects/p1.spec.ts --no-deps`
Expected: `5 passed`, tous `✘` (échec attendu). Puis lire `test-results/results.json` : SEC-06 clé numérique, SEC-07 201≠400, SEC-08 200≠400, SEC-09 n>0, ROB-01 note orpheline trouvée.

- [ ] **Step 4: Commit et push**

```bash
git add tests/defects/registry.ts tests/defects/p1.spec.ts
git commit -m "test: défauts P1 en échec attendu (SEC-06 à 09, ROB-01)"
git push
```

---

### Task 2: Défaut UI BUG-01 (fuseau négatif)

**Files:**
- Create: `tests/defects/bug-01.spec.ts`

**Interfaces:**
- Consumes: `expectDefect`, `loginAs`, `credentialsOf`, `actor`, `createNote`, `uniqueDescription`, `loginUI`.

- [ ] **Step 1: Écrire `tests/defects/bug-01.spec.ts`**

```ts
import { expect, test } from '@playwright/test'
import { actor } from '../support/actors'
import { credentialsOf, loginAs } from '../support/auth'
import { createNote, uniqueDescription } from '../support/notes'
import { loginUI } from '../support/ui'
import { expectDefect } from './registry'

test.use({ timezoneId: 'America/New_York' })

test('BUG-01 la date saisie s’affiche telle quelle en fuseau négatif', { tag: ['@defect', '@BUG-01'] }, async ({ page }) => {
  const emp = await loginAs('empA1')
  const description = uniqueDescription('Fuseau')
  await createNote(emp, { description, expenseDate: '2026-03-12' })
  await emp.dispose()

  await loginUI(page, credentialsOf(actor('empA1')))
  const row = page.getByRole('row').filter({ hasText: description })
  await expect(row).toBeVisible()
  expectDefect('BUG-01')
  await expect(row).toContainText('12 mars 2026', { timeout: 2_000 })
})
```

- [ ] **Step 2: Lancer sur la baseline**

Run: `npx playwright test tests/defects/bug-01.spec.ts --no-deps`
Expected: `1 passed` (`✘` attendu) ; raison : la ligne affiche `11 mars 2026`.

- [ ] **Step 3: Commit et push**

```bash
git add tests/defects/bug-01.spec.ts
git commit -m "test: défaut BUG-01 (date décalée en fuseau négatif) en échec attendu"
git push
```

---

### Task 3: Jeu de données de perf et scénarios k6

**Files:**
- Create: `scripts/seed-perf.mjs`, `tests/perf/k6/scenarios.js`

**Interfaces:**
- Produces: `scripts/seed-perf.mjs` lit `PERF_DATABASE_URL` ; acteurs `e1.sub1@c1.perf.test` (1 000 notes), `sub1@c1.perf.test` (48 rattachés), `hr@c1.perf.test`, mot de passe `perf-pass-1234`. `tests/perf/k6/scenarios.js` lit `SCENARIO`, `BASE_URL`, `PERF_DURATION` ; sous-métriques `http_req_duration{scenario:main}` et `http_req_failed{scenario:main}`.

- [ ] **Step 1: Créer `scripts/seed-perf.mjs`**

```js
// Gros volume pour les mesures de performance (spec §8.1) : 20 entreprises,
// 2 000 utilisateurs, environ 193 000 notes. Distribution déterministe
// (aucun aléa) : deux exécutions produisent les mêmes données.
// Cible une base dédiée (PERF_DATABASE_URL), déjà migrée par la version mesurée.
import bcrypt from 'bcryptjs'
import { config as loadEnv } from 'dotenv'
import { Pool } from 'pg'

loadEnv({ quiet: true })

const url = process.env.PERF_DATABASE_URL
if (!url) throw new Error('PERF_DATABASE_URL manquant')
const COMPANIES = Number(process.env.PERF_COMPANIES ?? 20)
const EMPLOYEES_PER_MANAGER = 48
const NOTES_PER_EMPLOYEE = 100
const HEAVY_EMPLOYEE_NOTES = 1000
const ROOT_MANAGER_NOTES = 20

const pool = new Pool({ connectionString: url })
const passwordHash = await bcrypt.hash('perf-pass-1234', 4)

try {
  await pool.query('BEGIN')
  await pool.query(
    `INSERT INTO companies (name, email_domain)
     SELECT 'perf' || c, 'c' || c || '.perf.test' FROM generate_series(1, $1) c`,
    [COMPANIES]
  )
  await pool.query(
    `INSERT INTO users (company_id, name, email, password_hash, role)
     SELECT co.id, r.label || ' ' || co.name, r.local || '@' || co.email_domain, $1, r.role
     FROM companies co
     CROSS JOIN (VALUES ('HR', 'hr', 'hr_admin'), ('Root', 'root', 'manager')) AS r(label, local, role)
     WHERE co.email_domain LIKE '%.perf.test'`,
    [passwordHash]
  )
  await pool.query(
    `INSERT INTO users (company_id, name, email, password_hash, role, manager_id)
     SELECT root.company_id, 'Sub' || s || ' ' || co.name, 'sub' || s || '@' || co.email_domain, $1, 'manager', root.id
     FROM users root
     JOIN companies co ON co.id = root.company_id
     CROSS JOIN generate_series(1, 2) s
     WHERE root.email LIKE 'root@%.perf.test'`,
    [passwordHash]
  )
  await pool.query(
    `INSERT INTO users (company_id, name, email, password_hash, role, manager_id)
     SELECT sub.company_id, 'Employee ' || e || ' ' || split_part(sub.email, '@', 1),
            'e' || e || '.' || sub.email, $1, 'employee', sub.id
     FROM users sub
     CROSS JOIN generate_series(1, $2) e
     WHERE sub.email LIKE 'sub%@%.perf.test'`,
    [passwordHash, EMPLOYEES_PER_MANAGER]
  )
  const insertNotes = `
    INSERT INTO expense_notes (user_id, amount, expense_date, description, receipt_key, status, created_at)
    SELECT u.id, ((n * 37) % 50000) / 100.0 + 1, DATE '2026-01-01' + (n % 300), 'Perf ' || n,
           'perf/receipt.png', (ARRAY['pending', 'approved', 'rejected'])[1 + n % 3],
           TIMESTAMPTZ '2026-09-01' - make_interval(mins => n)
    FROM users u CROSS JOIN generate_series($2::int, $3::int) n
    WHERE u.email LIKE $1`
  await pool.query(insertNotes, ['e%@%.perf.test', 1, NOTES_PER_EMPLOYEE])
  await pool.query(insertNotes, ['e1.sub1@c1.perf.test', NOTES_PER_EMPLOYEE + 1, HEAVY_EMPLOYEE_NOTES])
  await pool.query(insertNotes, ['root@%.perf.test', 1, ROOT_MANAGER_NOTES])
  await pool.query('COMMIT')

  const { rows } = await pool.query(
    `SELECT (SELECT count(*) FROM users WHERE email LIKE '%.perf.test')::int AS users,
            (SELECT count(*) FROM expense_notes)::int AS notes`
  )
  console.log(`seed-perf : ${rows[0].users} utilisateurs, ${rows[0].notes} notes.`)
} catch (error) {
  await pool.query('ROLLBACK').catch(() => undefined)
  throw error
} finally {
  await pool.end()
}
```

- [ ] **Step 2: Créer `tests/perf/k6/scenarios.js`**

```js
// Scénarios de performance (spec §8.2). Un scénario par exécution :
//   k6 run -e SCENARIO=P-EMP -e BASE_URL=http://localhost:3100 tests/perf/k6/scenarios.js
// Les connexions (bcrypt) ont lieu dans setup() et sont exclues des mesures :
// seules les sous-métriques {scenario:main} sont exploitées.
import http from 'k6/http'
import { check } from 'k6'

const BASE = __ENV.BASE_URL || 'http://localhost:3100'
const SCENARIO = __ENV.SCENARIO
const DURATION = __ENV.PERF_DURATION || '15s'
const PASSWORD = 'perf-pass-1234'
const USERS = { emp: 'e1.sub1@c1.perf.test', mgr: 'sub1@c1.perf.test', hr: 'hr@c1.perf.test' }
const png = open('../../fixtures/receipts/receipt.png', 'b')

function login(email) {
  const jar = http.cookieJar()
  jar.clear(BASE)
  const csrfToken = http.get(`${BASE}/api/auth/csrf`).json('csrfToken')
  const res = http.post(
    `${BASE}/api/auth/callback/credentials`,
    { email, password: PASSWORD, csrfToken, callbackUrl: `${BASE}/expenses` },
    { redirects: 0 }
  )
  const cookies = jar.cookiesForURL(BASE)
  const session = Object.keys(cookies)
    .filter((name) => name.includes('authjs.session-token'))
    .map((name) => `${name}=${cookies[name][0]}`)
    .join('; ')
  if (!session) throw new Error(`connexion refusée pour ${email} (HTTP ${res.status})`)
  return { res, cookie: session }
}

const get = (path) => (params) => http.get(`${BASE}${path}`, params)
const receiptFile = () => http.file(png, 'receipt.png', 'image/png')

const SCENARIOS = {
  'P-EMP': { actor: 'emp', vus: 5, run: get('/api/expense-notes') },
  'P-MGR': { actor: 'mgr', vus: 5, run: get('/api/manager/expense-notes') },
  'P-HR': { actor: 'hr', vus: 5, run: get('/api/hr/expense-notes') },
  'P-USERS': { actor: 'hr', vus: 5, run: get('/api/hr/users') },
  'P-CREATE': {
    actor: 'emp',
    vus: 5,
    run: (params) =>
      http.post(
        `${BASE}/api/expense-notes`,
        { amount: '12.50', expenseDate: '2026-03-12', description: `Perf create ${__VU}-${__ITER}`, receipt: receiptFile() },
        params
      ),
  },
  'P-OCR': {
    actor: 'emp',
    vus: 5,
    run: (params) => http.post(`${BASE}/api/expense-notes/receipt-suggestion`, { receipt: receiptFile() }, params),
  },
  'P-MIX': {
    ramp: true,
    run: (_params, auth) => {
      const pick = __ITER % 4
      if (pick === 0) return http.get(`${BASE}/api/expense-notes`, { headers: { Cookie: auth.emp } })
      if (pick === 1) return http.get(`${BASE}/api/manager/expense-notes`, { headers: { Cookie: auth.mgr } })
      if (pick === 2) return http.get(`${BASE}/api/hr/expense-notes`, { headers: { Cookie: auth.hr } })
      return http.get(`${BASE}/api/hr/users`, { headers: { Cookie: auth.hr } })
    },
  },
  'P-LOGIN': { vus: 2, run: () => login(USERS.emp).res },
}

const selected = SCENARIOS[SCENARIO]
if (!selected) throw new Error(`SCENARIO inconnu : ${SCENARIO}`)

export const options = {
  scenarios: {
    main: selected.ramp
      ? { executor: 'ramping-vus', startVUs: 0, stages: [{ duration: DURATION, target: 50 }] }
      : { executor: 'constant-vus', vus: selected.vus, duration: DURATION },
  },
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'],
  thresholds: {
    'http_req_duration{scenario:main}': ['max>=0'],
    'http_req_failed{scenario:main}': ['rate>=0'],
    'http_reqs{scenario:main}': ['count>=0'],
  },
}

export function setup() {
  return { emp: login(USERS.emp).cookie, mgr: login(USERS.mgr).cookie, hr: login(USERS.hr).cookie }
}

export default function (auth) {
  const params = selected.actor ? { headers: { Cookie: auth[selected.actor] } } : {}
  const res = selected.run(params, auth)
  check(res, { 'statut 2xx': (r) => r.status >= 200 && r.status < 300 })
}
```

- [ ] **Step 3: Vérifier le seed et un scénario à la main**

```bash
psql "postgres://expense:expense@localhost:5433/expense_io" -c "DROP DATABASE IF EXISTS expense_io_perf WITH (FORCE)" -c "CREATE DATABASE expense_io_perf"
DATABASE_URL=postgres://expense:expense@localhost:5433/expense_io_perf npm run migrate:up
PERF_DATABASE_URL=postgres://expense:expense@localhost:5433/expense_io_perf node scripts/seed-perf.mjs
```

(Sans `psql` local : `docker compose exec postgres psql -U expense -d expense_io -c ...`.)
Expected: `seed-perf : 2000 utilisateurs, 193700 notes.`

- [ ] **Step 4: Commit et push**

```bash
git add scripts/seed-perf.mjs tests/perf/k6/scenarios.js
git commit -m "test(perf): jeu de données de perf et scénarios k6"
git push
```

---

### Task 4: Comparaison A/B automatisée (compare.mjs, targets.json)

**Files:**
- Create: `tests/perf/targets.json`, `tests/perf/compare.mjs`
- Modify: `.gitignore` (ajouter `/perf-results/`), `Makefile` (cibles `test-perf`, `perf-aa`)

**Interfaces:**
- Consumes: `scripts/seed-perf.mjs`, `tests/perf/k6/scenarios.js`.
- Produces: `perf-results/latest.json`, `perf-results/latest.md`, `perf-results/history-line.jsonl` ; code de sortie 1 si régression, objectif PERF manqué alors que `fixed: true`, objectif atteint alors que `fixed: false`, ou taux d'erreur > 1 %.

- [ ] **Step 1: Créer `tests/perf/targets.json`**

```json
{
  "PERF-01": {
    "title": "Worker Tesseract recréé à chaque requête",
    "scenarios": ["P-OCR"],
    "maxRatio": 0.5,
    "fixed": false
  },
  "PERF-02": {
    "title": "Index manquants sur les colonnes filtrées",
    "scenarios": ["P-EMP", "P-MGR", "P-HR"],
    "maxRatio": 0.5,
    "fixed": false
  }
}
```

- [ ] **Step 2: Créer `tests/perf/compare.mjs`**

```js
// Comparaison de performance A/B : version courante contre la baseline
// (spec §8.3). Chaque passage recrée une base dédiée, démarre la version en
// build de production sur le port 3100, chauffe, puis exécute les scénarios
// k6. Les passages alternent A, B, A, B… ; on compare les médianes de p95.
//
//   node tests/perf/compare.mjs          # baseline contre version courante
//   node tests/perf/compare.mjs --aa     # baseline contre elle-même (bruit)
//
// Variables : PERF_RUNS (3), PERF_DURATION (15s), PERF_WARMUP (10),
// PERF_SCENARIOS (liste), PERF_BASELINE_DIR (../expense-io-baseline),
// PERF_SKIP_BUILD=1, PERF_REGRESSION_RATIO (1.10), PERF_UNSTABLE_SPREAD (0.25).
import { execFileSync, spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { config as loadEnv } from 'dotenv'
import pg from 'pg'

loadEnv({ quiet: true })

const ROOT = process.cwd()
const AA = process.argv.includes('--aa')
const BASELINE_SHA = '265924bc7274047989e708ab635c2854d376230f'
const BASELINE_DIR = path.resolve(process.env.PERF_BASELINE_DIR ?? '../expense-io-baseline')
const RUNS = Number(process.env.PERF_RUNS ?? 3)
const DURATION = process.env.PERF_DURATION ?? '15s'
const WARMUP_S = Number(process.env.PERF_WARMUP ?? 10)
const REGRESSION_RATIO = Number(process.env.PERF_REGRESSION_RATIO ?? 1.1)
const UNSTABLE_SPREAD = Number(process.env.PERF_UNSTABLE_SPREAD ?? 0.25)
const SCENARIOS = (process.env.PERF_SCENARIOS ?? 'P-EMP,P-MGR,P-HR,P-USERS,P-CREATE,P-OCR,P-MIX,P-LOGIN').split(',')
const PORT = 3100
const OUT_DIR = path.join(ROOT, 'perf-results')
const MAIN_DB_URL = process.env.DATABASE_URL
if (!MAIN_DB_URL) throw new Error('DATABASE_URL manquant')
const PERF_DB_URL = withDatabase(MAIN_DB_URL, 'expense_io_perf')
const TARGETS = JSON.parse(readFileSync(path.join(ROOT, 'tests/perf/targets.json'), 'utf8'))

function withDatabase(url, database) {
  const parsed = new URL(url)
  parsed.pathname = `/${database}`
  return parsed.toString()
}

function run(cmd, args, options = {}) {
  execFileSync(cmd, args, { stdio: 'inherit', ...options })
}

function hasK6Binary() {
  try {
    execFileSync('k6', ['version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function ensureBaseline() {
  if (!existsSync(path.join(BASELINE_DIR, 'package.json'))) {
    run('git', ['worktree', 'add', BASELINE_DIR, BASELINE_SHA])
  }
  if (existsSync(path.join(ROOT, '.env')) && !existsSync(path.join(BASELINE_DIR, '.env'))) {
    copyFileSync(path.join(ROOT, '.env'), path.join(BASELINE_DIR, '.env'))
  }
  if (!existsSync(path.join(BASELINE_DIR, 'node_modules'))) run('npm', ['ci'], { cwd: BASELINE_DIR })
  if (!existsSync(path.join(BASELINE_DIR, '.next', 'BUILD_ID'))) run('npm', ['run', 'build'], { cwd: BASELINE_DIR })
}

async function prepareDatabase(appDir) {
  const admin = new pg.Client({ connectionString: MAIN_DB_URL })
  await admin.connect()
  try {
    await admin.query('DROP DATABASE IF EXISTS expense_io_perf WITH (FORCE)')
    await admin.query('CREATE DATABASE expense_io_perf')
  } finally {
    await admin.end()
  }
  run('npm', ['run', 'migrate:up'], { cwd: appDir, env: { ...process.env, DATABASE_URL: PERF_DB_URL } })
  run('node', ['scripts/seed-perf.mjs'], { cwd: ROOT, env: { ...process.env, PERF_DATABASE_URL: PERF_DB_URL } })
}

async function startApp(appDir, label) {
  mkdirSync(OUT_DIR, { recursive: true })
  const log = openSync(path.join(OUT_DIR, `server-${label}.log`), 'a')
  const started = Date.now()
  const child = spawn('npm', ['run', 'start', '--', '-p', String(PORT)], {
    cwd: appDir,
    env: { ...process.env, DATABASE_URL: PERF_DB_URL, AUTH_TRUST_HOST: 'true' },
    stdio: ['ignore', log, log],
    detached: true,
  })
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/login`)
      if (res.ok) return { child, coldStartMs: Date.now() - started }
    } catch {
      // serveur pas encore prêt
    }
    await sleep(500)
  }
  stopApp(child)
  throw new Error(`${label} : le serveur n'a pas répondu sur le port ${PORT}`)
}

function stopApp(child) {
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    // déjà arrêté
  }
}

function rssMb(child) {
  try {
    const out = execFileSync('ps', ['-A', '-o', 'pgid=,rss='], { encoding: 'utf8' })
    const kb = out
      .split('\n')
      .map((line) => line.trim().split(/\s+/))
      .filter(([pgid]) => Number(pgid) === child.pid)
      .reduce((sum, [, rss]) => sum + Number(rss), 0)
    return Math.round(kb / 1024)
  } catch {
    return null
  }
}

function runK6(scenario, duration, outFile) {
  const env = ['-e', `SCENARIO=${scenario}`, '-e', `PERF_DURATION=${duration}`]
  const script = 'tests/perf/k6/scenarios.js'
  if (hasK6Binary()) {
    run('k6', ['run', '--quiet', '--summary-export', outFile, ...env, '-e', `BASE_URL=http://localhost:${PORT}`, script])
    return
  }
  const linux = process.platform === 'linux'
  const base = linux ? `http://localhost:${PORT}` : `http://host.docker.internal:${PORT}`
  run('docker', [
    'run', '--rm', ...(linux ? ['--network', 'host'] : []),
    '-v', `${ROOT}:/work`, '-w', '/work',
    'grafana/k6:0.54.0', 'run', '--quiet',
    '--summary-export', path.relative(ROOT, outFile), ...env, '-e', `BASE_URL=${base}`, script,
  ])
}

function readSummary(file) {
  const { metrics } = JSON.parse(readFileSync(file, 'utf8'))
  const duration = metrics['http_req_duration{scenario:main}']
  const failed = metrics['http_req_failed{scenario:main}']
  const reqs = metrics['http_reqs{scenario:main}']
  return {
    p50: duration.med,
    p95: duration['p(95)'],
    p99: duration['p(99)'],
    requests: reqs.count,
    errorRate: failed.value,
  }
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
const spread = (values) => {
  const m = median(values)
  return m === 0 ? 0 : (Math.max(...values) - Math.min(...values)) / m
}

async function measure(version, runIndex, raw) {
  console.log(`\n=== Passage ${runIndex + 1}/${RUNS} — ${version.label} ===`)
  await prepareDatabase(version.dir)
  const { child, coldStartMs } = await startApp(version.dir, version.label)
  try {
    raw[version.key].coldStartMs.push(coldStartMs)
    runK6('P-MIX', `${WARMUP_S}s`, path.join(OUT_DIR, 'warmup.json'))
    for (const scenario of SCENARIOS) {
      const file = path.join(OUT_DIR, `${version.key}-${runIndex}-${scenario}.json`)
      runK6(scenario, DURATION, file)
      ;(raw[version.key].scenarios[scenario] ??= []).push(readSummary(file))
    }
    raw[version.key].rssMb.push(rssMb(child))
  } finally {
    stopApp(child)
    await sleep(1000)
  }
}

function aggregate(samples) {
  return {
    p50: median(samples.map((s) => s.p50)),
    p95: median(samples.map((s) => s.p95)),
    p99: median(samples.map((s) => s.p99)),
    requests: median(samples.map((s) => s.requests)),
    errorRate: Math.max(...samples.map((s) => s.errorRate)),
    spread: spread(samples.map((s) => s.p95)),
  }
}

function evaluate(raw) {
  const rows = []
  const failures = []
  for (const scenario of SCENARIOS) {
    const base = aggregate(raw.base.scenarios[scenario])
    const cur = aggregate(raw.current.scenarios[scenario])
    const ratio = cur.p95 / base.p95
    const unstable = base.spread > UNSTABLE_SPREAD || cur.spread > UNSTABLE_SPREAD
    let status = 'ok'
    if (cur.errorRate > 0.01) status = 'erreurs'
    else if (unstable) status = 'instable'
    else if (scenario === 'P-LOGIN' && ratio < 0.5) status = 'bcrypt affaibli ?'
    else if (scenario !== 'P-LOGIN' && ratio > REGRESSION_RATIO) status = 'régression'
    if (!AA && ['erreurs', 'régression', 'bcrypt affaibli ?'].includes(status)) failures.push(`${scenario} : ${status}`)
    rows.push({ scenario, base, cur, ratio, status })
  }
  const targets = []
  if (!AA) {
    for (const [id, target] of Object.entries(TARGETS)) {
      const ratios = target.scenarios.map((s) => rows.find((r) => r.scenario === s)?.ratio).filter((r) => r !== undefined)
      if (ratios.length === 0) continue
      const met = ratios.every((r) => r <= target.maxRatio)
      let status
      if (met && !target.fixed) {
        status = 'objectif atteint mais fixed: false → passer fixed: true'
        failures.push(`${id} : ${status}`)
      } else if (!met && target.fixed) {
        status = 'déclaré corrigé mais objectif manqué'
        failures.push(`${id} : ${status}`)
      } else status = met ? 'corrigé' : 'ouvert'
      targets.push({ id, title: target.title, ratios, maxRatio: target.maxRatio, status })
    }
  }
  return { rows, targets, failures }
}

function sha() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return 'inconnu'
  }
}

function render(result, raw, meta) {
  const ms = (v) => `${Math.round(v)} ms`
  const pct = (r) => `${r <= 1 ? '−' : '+'}${Math.abs(Math.round((r - 1) * 100))} %`
  const lines = [
    `# Performance — ${AA ? 'A/A (bruit)' : 'baseline contre version courante'}`,
    '',
    `Commit \`${meta.sha}\` · ${meta.date} · ${RUNS} passage(s) alternés · ${DURATION} par scénario`,
    '',
    `| Scénario | p95 ${AA ? 'A' : 'baseline'} | p95 ${AA ? 'A′' : 'courant'} | Écart | Dispersion | Statut |`,
    '|---|---|---|---|---|---|',
    ...result.rows.map(
      (r) =>
        `| ${r.scenario} | ${ms(r.base.p95)} | ${ms(r.cur.p95)} | ${pct(r.ratio)} | ${Math.round(Math.max(r.base.spread, r.cur.spread) * 100)} % | ${r.status} |`
    ),
    '',
    `Démarrage à froid : ${ms(median(raw.base.coldStartMs))} → ${ms(median(raw.current.coldStartMs))} · Mémoire après P-MIX : ${median(raw.base.rssMb.filter(Boolean))} Mo → ${median(raw.current.rssMb.filter(Boolean))} Mo`,
  ]
  if (result.targets.length) {
    lines.push('', '## Objectifs', '', '| ID | Défaut | Ratios p95 | Objectif | Statut |', '|---|---|---|---|---|')
    for (const t of result.targets) {
      lines.push(`| ${t.id} | ${t.title} | ${t.ratios.map((r) => r.toFixed(2)).join(', ')} | ≤ ${t.maxRatio} | ${t.status} |`)
    }
  }
  lines.push('', result.failures.length ? `**Échec** : ${result.failures.join(' ; ')}` : '**Verdict** : aucun problème détecté.')
  return lines.join('\n') + '\n'
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  ensureBaseline()
  if (!AA && process.env.PERF_SKIP_BUILD !== '1') run('npm', ['run', 'build'], { cwd: ROOT })
  const versions = AA
    ? [{ key: 'base', label: 'baseline', dir: BASELINE_DIR }, { key: 'current', label: 'baseline-bis', dir: BASELINE_DIR }]
    : [{ key: 'base', label: 'baseline', dir: BASELINE_DIR }, { key: 'current', label: 'courant', dir: ROOT }]
  const raw = Object.fromEntries(versions.map((v) => [v.key, { scenarios: {}, coldStartMs: [], rssMb: [] }]))
  for (let i = 0; i < RUNS; i++) {
    for (const version of versions) await measure(version, i, raw)
  }
  const result = evaluate(raw)
  const meta = { sha: sha(), date: new Date().toISOString(), mode: AA ? 'aa' : 'ab', runs: RUNS, duration: DURATION }
  const markdown = render(result, raw, meta)
  writeFileSync(path.join(OUT_DIR, 'latest.json'), JSON.stringify({ meta, raw, ...result }, null, 2))
  writeFileSync(path.join(OUT_DIR, 'latest.md'), markdown)
  const historyLine = { ...meta, ratios: Object.fromEntries(result.rows.map((r) => [r.scenario, Number(r.ratio.toFixed(3))])) }
  writeFileSync(path.join(OUT_DIR, 'history-line.jsonl'), JSON.stringify(historyLine) + '\n')
  console.log(`\n${markdown}`)
  if (result.failures.length) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 3: `.gitignore` et `Makefile`**

`.gitignore`, section tests : ajouter `/perf-results/`.

`Makefile` : ajouter `test-perf perf-aa` à `.PHONY`, puis :

```make
test-perf: up migrate ensure-bucket ## Performance : baseline contre version courante (k6, environ 15 min)
	node tests/perf/compare.mjs

perf-aa: up migrate ensure-bucket ## Performance : baseline contre elle-même, mesure du bruit
	node tests/perf/compare.mjs --aa
```

- [ ] **Step 4: Vérification rapide**

Run: `PERF_RUNS=1 PERF_DURATION=5s PERF_WARMUP=3 node tests/perf/compare.mjs`
Expected : deux passages (baseline, courant), tableau imprimé, `seed-perf : 2000 utilisateurs, 193700 notes.` avant chaque démarrage, code de sortie 0 (aucune différence de code applicatif : ratios proches de 1 ; PERF-01/02 « ouvert »). Si un ratio sort du seuil à cause du bruit d'un passage unique, relancer avec `PERF_RUNS=3` avant de conclure.

- [ ] **Step 5: Vérifier qu'aucun serveur ne reste sur le port 3100**

Run: `lsof -iTCP:3100 -sTCP:LISTEN || echo libre`
Expected: `libre`

- [ ] **Step 6: Commit et push**

```bash
git add tests/perf/targets.json tests/perf/compare.mjs .gitignore Makefile
git commit -m "test(perf): comparaison A/B automatisée contre la baseline"
git push
```

---

### Task 5: Mesure du bruit (A/A) et courbe historique

**Files:**
- Create: `tests/perf/trend.mjs`, `docs/perf/README.md`

**Interfaces:**
- Consumes: `perf-results/history-line.jsonl`, format `{ sha, date, mode, ratios: Record<string, number> }`.
- Produces: `node tests/perf/trend.mjs <history.jsonl> <sortie.md>`.

- [ ] **Step 1: Créer `tests/perf/trend.mjs`**

```js
// Courbe de progression de la migration : ratio p95 courant / baseline par
// scénario, une colonne par mesure de l'historique (diagramme Mermaid,
// rendu nativement par GitHub).
//   node tests/perf/trend.mjs docs/perf/history.jsonl docs/perf/trend.md
import { readFileSync, writeFileSync } from 'node:fs'

const [input, output] = process.argv.slice(2)
if (!input || !output) throw new Error('usage : node tests/perf/trend.mjs <history.jsonl> <sortie.md>')

const entries = readFileSync(input, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line))
  .filter((entry) => entry.mode === 'ab')
const scenarios = [...new Set(entries.flatMap((entry) => Object.keys(entry.ratios)))]
const labels = entries.map((entry) => `"${entry.sha}"`)

const lines = [
  '# Performance — progression de la migration',
  '',
  'Ratio p95 version courante / baseline (1 = identique, < 1 = plus rapide).',
  '',
  '| Scénario | ' + entries.map((e) => `\`${e.sha}\``).join(' | ') + ' |',
  '|---|' + entries.map(() => '---').join('|') + '|',
  ...scenarios.map((s) => `| ${s} | ` + entries.map((e) => e.ratios[s]?.toFixed(2) ?? '—').join(' | ') + ' |'),
  '',
]
for (const scenario of scenarios) {
  const values = entries.map((entry) => entry.ratios[scenario] ?? 'null')
  lines.push(
    '```mermaid',
    'xychart-beta',
    `  title "${scenario}"`,
    `  x-axis [${labels.join(', ')}]`,
    '  y-axis "ratio p95" 0 --> 2',
    `  line [${values.join(', ')}]`,
    '```',
    ''
  )
}
writeFileSync(output, lines.join('\n'))
console.log(`${output} : ${entries.length} mesure(s), ${scenarios.length} scénario(s).`)
```

- [ ] **Step 2: Mesurer le bruit et vérifier la courbe**

```bash
PERF_RUNS=3 PERF_DURATION=10s node tests/perf/compare.mjs --aa
cp perf-results/latest.md "$SCRATCH/aa.md"
printf '%s\n' '{"sha":"aaaa111","date":"2026-10-12","mode":"ab","ratios":{"P-EMP":1.02,"P-OCR":0.98}}' '{"sha":"bbbb222","date":"2026-10-13","mode":"ab","ratios":{"P-EMP":0.41,"P-OCR":0.2}}' > "$SCRATCH/h.jsonl"
node tests/perf/trend.mjs "$SCRATCH/h.jsonl" "$SCRATCH/trend.md" && cat "$SCRATCH/trend.md"
```

Expected : rapport A/A avec la dispersion par scénario (le bruit) ; `trend.md` avec un tableau et un bloc Mermaid par scénario.

- [ ] **Step 3: Créer `docs/perf/README.md` avec la mesure A/A réelle**

Contenu : principe (A/B même machine, ratios), commandes (`make test-perf`, `make perf-aa`, variables), lecture du rapport (statuts `ok`, `instable`, `régression`, `erreurs`, `bcrypt affaibli ?`), objectifs PERF-01/02 et bascule `fixed` dans `tests/perf/targets.json`, **tableau du bruit mesuré en A/A** (copié de `aa.md`) et justification du seuil 1,10, historique (`perf-history`, `trend.md`), limites (seed-perf couplé au schéma comme seed-e2e).

- [ ] **Step 4: Commit et push**

```bash
git add tests/perf/trend.mjs docs/perf/README.md
git commit -m "test(perf): courbe de progression et mesure du bruit (A/A)"
git push
```

---

### Task 6: CI de perf, docs et règles agents

**Files:**
- Create: `.github/workflows/perf.yml`
- Modify: `tests/README.md`, `docs/tests/criteres-fin-de-migration.md`, `AGENTS.md`

- [ ] **Step 1: Créer `.github/workflows/perf.yml`**

```yaml
name: perf

on:
  pull_request:
    types: [labeled, synchronize]
  schedule:
    - cron: '0 3 * * *'
  workflow_dispatch:

concurrency:
  group: perf-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

env:
  CI: 'true'
  DATABASE_URL: postgres://expense:expense@localhost:5433/expense_io
  AUTH_SECRET: ci-main-instance-secret-0123456789abcdef
  AUTH_TRUST_HOST: 'true'
  S3_ENDPOINT: http://localhost:4567
  S3_REGION: us-east-1
  S3_ACCESS_KEY_ID: test
  S3_SECRET_ACCESS_KEY: test
  S3_BUCKET: receipts
  S3_FORCE_PATH_STYLE: 'true'
  PERF_BASELINE_DIR: ../baseline

jobs:
  perf:
    if: github.event_name != 'pull_request' || contains(github.event.pull_request.labels.*.name, 'perf')
    runs-on: ubuntu-latest
    timeout-minutes: 45
    permissions:
      contents: write
      pull-requests: write
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_USER: expense, POSTGRES_PASSWORD: expense, POSTGRES_DB: expense_io }
        ports: ['5433:5432']
        options: >-
          --health-cmd "pg_isready -U expense -d expense_io"
          --health-interval 5s --health-timeout 5s --health-retries 10
      localstack:
        image: localstack/localstack:3.8.1
        env: { SERVICES: s3 }
        ports: ['4567:4566']
        options: >-
          --health-cmd "curl -sf http://localhost:4566/_localstack/health"
          --health-interval 5s --health-timeout 5s --health-retries 20
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci && touch .env
      - run: npm run migrate:up && npm run ensure-bucket
      - uses: grafana/setup-k6-action@v1
        with:
          k6-version: '0.54.0'
      - id: compare
        run: node tests/perf/compare.mjs
      - if: always()
        run: cat perf-results/latest.md >> "$GITHUB_STEP_SUMMARY" || true
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: perf-results
          path: perf-results/
      - if: always() && github.event_name == 'pull_request'
        env:
          GH_TOKEN: ${{ github.token }}
        run: gh pr comment ${{ github.event.pull_request.number }} --body-file perf-results/latest.md || true
      - if: always() && github.event_name == 'schedule' && hashFiles('perf-results/history-line.jsonl') != ''
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898283+github-actions[bot]@users.noreply.github.com"
          if git ls-remote --exit-code --heads origin perf-history >/dev/null; then
            git fetch origin perf-history
            git worktree add -B perf-history ../perf-history origin/perf-history
          else
            git worktree add --orphan -b perf-history ../perf-history
          fi
          mkdir -p ../perf-history/docs/perf
          cat perf-results/history-line.jsonl >> ../perf-history/docs/perf/history.jsonl
          node tests/perf/trend.mjs ../perf-history/docs/perf/history.jsonl ../perf-history/docs/perf/trend.md
          cd ../perf-history
          git add docs/perf
          git commit -m "perf: mesure du $(date -u +%F)"
          git push origin perf-history
```

- [ ] **Step 2: Mettre à jour la documentation**

- `tests/README.md` : section « Performance » (renvoi vers `docs/perf/README.md`, `make test-perf`, label `perf`).
- `docs/tests/criteres-fin-de-migration.md` : §2.2, les défauts P1 deviennent des lignes du tableau (avec résultat attendu) ; §2.4, procédure de vérification perf (`make test-perf`, label `perf`, `tests/perf/targets.json`) ; §5, points d'attention SEC-06 à 09, ROB-01, BUG-01, PERF-01/02.
- `AGENTS.md` : règle 7 complétée (`make test-perf` avant toute PR touchant l'OCR, le SQL ou les listes ; bascule `fixed` dans `tests/perf/targets.json`).

- [ ] **Step 3: Vérifications finales**

```bash
npx tsc --noEmit && npm run lint
npx playwright test
```

Expected : aucune erreur ; suite complète verte (189 tests dont 27 `@defect` en échec attendu).

- [ ] **Step 4: Commit et push**

```bash
git add .github/workflows/perf.yml tests/README.md docs/tests/criteres-fin-de-migration.md AGENTS.md
git commit -m "ci(perf): workflow de comparaison A/B, docs et règles agents"
git push
```
