import { defineConfig } from 'vitest/config'

process.env.TZ = 'UTC'

const srcPath = new URL('./src', import.meta.url).pathname

export default defineConfig({
  resolve: {
    alias: {
      '#': srcPath,
      '@': srcPath,
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    passWithNoTests: false,
    clearMocks: true,
    restoreMocks: true,
  },
})
