import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    store: 'src/store/use-game-store.ts',
    'tournament-store': 'src/store/use-tournament-store.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // Shared modules (the store) are hoisted into a common chunk imported by both
  // entries, guaranteeing a single store instance across the package and apps.
  splitting: true,
  external: ['react', 'react-dom', 'framer-motion', 'lucide-react'],
})
