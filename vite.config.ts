/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // android/ and ios/ hold copies of the build (and native build output): don't watch them or scan their index.html.
  server: { watch: { ignored: ['**/android/**', '**/ios/**'] } },
  optimizeDeps: { entries: ['index.html'] },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
