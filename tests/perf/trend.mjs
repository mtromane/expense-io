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
