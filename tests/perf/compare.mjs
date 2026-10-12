// Comparaison de performance A/B : version courante contre la baseline
// (spec §8.3). Chaque passage recrée une base dédiée, démarre la version en
// build de production sur le port 3100, chauffe, puis exécute les scénarios
// k6. Les passages alternent A, B, A, B… ; on compare les médianes de p95.
//
//   node tests/perf/compare.mjs          # baseline contre version courante
//   node tests/perf/compare.mjs --aa     # baseline contre elle-même (bruit)
//   node tests/perf/compare.mjs --evaluate perf-results/latest.json
//                                        # réévalue un run existant (sans mesurer)
//
// Variables : PERF_RUNS (3), PERF_DURATION (15s), PERF_WARMUP (10),
// PERF_SCENARIOS (liste), PERF_BASELINE_DIR (../expense-io-baseline),
// PERF_SKIP_BUILD=1, PERF_REGRESSION_RATIO (1.10), PERF_MIN_DELTA_MS (5),
// PERF_UNSTABLE_SPREAD (0.25).
import { execFileSync, spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { config as loadEnv } from 'dotenv'
import pg from 'pg'

loadEnv({ quiet: true })

const ROOT = process.cwd()
const EVALUATE_FILE = process.argv.includes('--evaluate') ? process.argv[process.argv.indexOf('--evaluate') + 1] : null
let AA = process.argv.includes('--aa') // relu depuis le fichier en mode --evaluate
const BASELINE_SHA = '265924bc7274047989e708ab635c2854d376230f'
const BASELINE_DIR = path.resolve(process.env.PERF_BASELINE_DIR ?? '../expense-io-baseline')
const RUNS = Number(process.env.PERF_RUNS ?? 3)
const DURATION = process.env.PERF_DURATION ?? '15s'
const WARMUP_S = Number(process.env.PERF_WARMUP ?? 10)
const REGRESSION_RATIO = Number(process.env.PERF_REGRESSION_RATIO ?? 1.1)
const UNSTABLE_SPREAD = Number(process.env.PERF_UNSTABLE_SPREAD ?? 0.25)
// Sur des latences de quelques ms, 1 ms d'écart dépasse déjà 10 % : une
// régression exige aussi un écart absolu minimal.
const MIN_DELTA_MS = Number(process.env.PERF_MIN_DELTA_MS ?? 5)
// Au-delà de ce ratio (bien au-dessus du bruit A/A mesuré, 22 % au pire),
// une régression est signalée même sous le plancher de quelques ms.
const LARGE_RATIO = Number(process.env.PERF_LARGE_RATIO ?? 1.5)
const SCENARIOS = (process.env.PERF_SCENARIOS ?? 'P-EMP,P-MGR,P-HR,P-USERS,P-CREATE,P-OCR,P-MIX,P-LOGIN').split(',')
const PORT = 3100
const OUT_DIR = path.join(ROOT, 'perf-results')
const MAIN_DB_URL = process.env.DATABASE_URL
if (!MAIN_DB_URL && !EVALUATE_FILE) throw new Error('DATABASE_URL manquant')
const PERF_DB_URL = MAIN_DB_URL ? withDatabase(MAIN_DB_URL, 'expense_io_perf') : null
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

let currentChild = null
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (currentChild) stopApp(currentChild)
    process.exit(130)
  })
}

async function portInUse() {
  try {
    await fetch(`http://localhost:${PORT}/login`, { signal: AbortSignal.timeout(1000) })
    return true
  } catch {
    return false
  }
}

async function startApp(appDir, label) {
  mkdirSync(OUT_DIR, { recursive: true })
  if (await portInUse()) {
    throw new Error(
      `Le port ${PORT} est déjà occupé (serveur d'un run interrompu ?) : l'arrêter avant de mesurer, ` +
        `par exemple \`lsof -tiTCP:${PORT} -sTCP:LISTEN | xargs kill\`.`
    )
  }
  const log = openSync(path.join(OUT_DIR, `server-${label}.log`), 'a')
  const started = Date.now()
  const child = spawn('npm', ['run', 'start', '--', '-p', String(PORT)], {
    cwd: appDir,
    env: { ...process.env, DATABASE_URL: PERF_DB_URL, AUTH_TRUST_HOST: 'true' },
    stdio: ['ignore', log, log],
    detached: true,
  })
  currentChild = child
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) {
      throw new Error(`${label} : le serveur s'est arrêté au démarrage (voir ${path.join(OUT_DIR, `server-${label}.log`)})`)
    }
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
  if (currentChild === child) currentChild = null
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
  rmSync(outFile, { force: true }) // jamais relire le résumé d'une exécution précédente
  const env = ['-e', `SCENARIO=${scenario}`, '-e', `PERF_DURATION=${duration}`]
  const script = 'tests/perf/k6/scenarios.js'
  if (hasK6Binary()) {
    run('k6', ['run', '--quiet', '--summary-export', outFile, ...env, '-e', `BASE_URL=http://localhost:${PORT}`, script])
    return
  }
  const linux = process.platform === 'linux'
  const base = linux ? `http://localhost:${PORT}` : `http://host.docker.internal:${PORT}`
  run('docker', [
    'run', '--rm', ...(linux ? ['--network', 'host', '--user', `${process.getuid()}:${process.getgid()}`] : []),
    '-v', `${ROOT}:/work`, '-w', '/work',
    'grafana/k6:0.54.0', 'run', '--quiet',
    '--summary-export', path.relative(ROOT, outFile), ...env, '-e', `BASE_URL=${base}`, script,
  ])
}

function readSummary(file) {
  if (!existsSync(file)) throw new Error(`k6 n'a pas produit de résumé : ${file}`)
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
  for (const scenario of Object.keys(raw.base.scenarios)) {
    const base = aggregate(raw.base.scenarios[scenario])
    const cur = aggregate(raw.current.scenarios[scenario])
    const ratio = cur.p95 / base.p95
    const delta = cur.p95 - base.p95
    const unstable = base.spread > UNSTABLE_SPREAD || cur.spread > UNSTABLE_SPREAD
    // Séparation nette : même le meilleur passage courant est plus lent que le
    // pire passage baseline (× seuil). Vaut même quand la mesure est instable.
    const curBest = Math.min(...raw.current.scenarios[scenario].map((s) => s.p95))
    const baseWorst = Math.max(...raw.base.scenarios[scenario].map((s) => s.p95))
    const separated = curBest > baseWorst * REGRESSION_RATIO && delta > MIN_DELTA_MS
    const significant = !unstable && ((ratio > REGRESSION_RATIO && delta > MIN_DELTA_MS) || ratio > LARGE_RATIO)
    let status = 'ok'
    if (cur.errorRate > 0.01) status = 'erreurs'
    else if (separated || significant) status = 'régression'
    else if (unstable) status = 'instable'
    if (!AA && ['erreurs', 'régression'].includes(status)) failures.push(`${scenario} : ${status}`)
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
  if (EVALUATE_FILE) {
    const saved = JSON.parse(readFileSync(EVALUATE_FILE, 'utf8'))
    AA = saved.meta.mode === 'aa'
    const result = evaluate(saved.raw)
    console.log(render(result, saved.raw, saved.meta))
    process.exit(result.failures.length ? 1 : 0)
  }
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
