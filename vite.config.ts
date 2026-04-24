import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { injectRootSeoIntoHtml } from './src/lib/seo-metadata'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'battle-brothers-root-seo',
      transformIndexHtml(html) {
        return injectRootSeoIntoHtml(html)
      },
    },
  ],
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
