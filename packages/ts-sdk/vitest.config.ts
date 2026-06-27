/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/*.test.{ts,tsx}',
      'src/**/*.vitest.{ts,tsx}',
      'tests/**/*.test.{ts,tsx}',
      'tests/**/*.vitest.{ts,tsx}',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    conditions: ['node', 'default'],
  },
})
