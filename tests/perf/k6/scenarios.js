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
// writer : employé dédié aux écritures (P-CREATE, P-OCR), lu par aucun autre
// scénario, pour que les notes créées ne gonflent pas les listes mesurées.
const USERS = { emp: 'e1.sub1@c1.perf.test', mgr: 'sub1@c1.perf.test', hr: 'hr@c1.perf.test', writer: 'writer@c1.perf.test' }
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
    actor: 'writer',
    vus: 5,
    run: (params) =>
      http.post(
        `${BASE}/api/expense-notes`,
        { amount: '12.50', expenseDate: '2026-03-12', description: `Perf create ${__VU}-${__ITER}`, receipt: receiptFile() },
        params
      ),
  },
  'P-OCR': {
    actor: 'writer',
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
  return {
    emp: login(USERS.emp).cookie,
    mgr: login(USERS.mgr).cookie,
    hr: login(USERS.hr).cookie,
    writer: login(USERS.writer).cookie,
  }
}

export default function (auth) {
  const params = selected.actor ? { headers: { Cookie: auth[selected.actor] } } : {}
  const res = selected.run(params, auth)
  check(res, { 'statut 2xx': (r) => r.status >= 200 && r.status < 300 })
}
