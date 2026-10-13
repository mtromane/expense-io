// Gros volume pour les mesures de performance (spec §8.1) : 20 entreprises,
// 2 001 utilisateurs, environ 193 000 notes. Distribution déterministe
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
  // Employé dédié aux scénarios d'écriture (P-CREATE, P-OCR) : sans manager,
  // ses notes n'apparaissent dans aucune liste lue par les autres scénarios.
  await pool.query(
    `INSERT INTO users (company_id, name, email, password_hash, role)
     SELECT id, 'Writer perf1', 'writer@c1.perf.test', $1, 'employee' FROM companies WHERE email_domain = 'c1.perf.test'`,
    [passwordHash]
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
