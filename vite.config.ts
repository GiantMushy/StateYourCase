/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // android/ holds a copy of the build (and Gradle output): don't watch it or scan its index.html.
  server: { watch: { ignored: ['**/android/**'] } },
  optimizeDeps: { entries: ['index.html'] },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
