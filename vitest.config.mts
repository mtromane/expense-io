import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Tests unitaires (tests/unit/**/*.test.ts). Les tests Playwright sont en
// *.spec.ts : les deux suites ne se recouvrent pas.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // Formats de date et de montant déterministes, quel que soit le poste.
    env: { TZ: 'Europe/Paris' },
    restoreMocks: true,
    unstubEnvs: true,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/domain/**', 'src/utils/**', 'src/proxy.ts', 'src/modules/**', 'src/config.ts'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
})
