import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  use: {
    baseURL: 'http://127.0.0.1:5299',
    channel: 'chrome',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    hasTouch: true,
  },
  webServer: {
    command: 'npx vite --port 5299 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:5299',
    reuseExistingServer: true,
  },
})
