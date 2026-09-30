import { defineConfig, devices } from '@playwright/test'

try {
  process.loadEnvFile('.env')
} catch {
  // Sin .env (p. ej. en CI) las variables ya vienen del entorno.
}

const PUERTO = 4173

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  // Las pruebas comparten la base de desarrollo: una a la vez.
  workers: 1,
  reporter: 'list',
  // La base de desarrollo está en la nube: guardar puede tardar varios segundos.
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    // El service worker cachearía y taparía lo que `page.route` intenta simular.
    serviceWorkers: 'block',
    viewport: { width: 390, height: 844 },
  },
  projects: [
    {
      name: 'movil',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm start',
    url: `http://localhost:${PUERTO}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
})
