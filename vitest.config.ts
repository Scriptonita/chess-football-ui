import { defineConfig } from 'vitest/config'
import path from 'path'

// Tests run against the package SOURCE (src/), so React and the store resolve to
// this package's own single copy — no dual-package hazard to work around here
// (that only affects the apps that consume the built dist).
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/index.ts', 'src/**/*.d.ts'],
    },
  },
  resolve: {
    alias: [{ find: '@', replacement: path.resolve(__dirname, 'src') }],
    dedupe: ['react', 'react-dom'],
  },
})
