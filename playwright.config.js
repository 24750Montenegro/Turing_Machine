import { defineConfig } from '@playwright/test'
import { argumentos, canal } from './scripts/navegador.mjs'

const PUERTO = 5189

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PUERTO}/`,
    channel: canal,
    viewport: { width: 1600, height: 950 },
    acceptDownloads: true,
    launchOptions: { args: argumentos },
  },
  webServer: {
    command: `npx vite --port ${PUERTO} --strictPort`,
    url: `http://localhost:${PUERTO}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
