import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/**
 * Injects a deterministic build hash and all fingerprinted `/assets/*` files
 * (JS chunks, CSS, and self-hosted Vazirmatn WOFF2 fonts) into `dist/sw.js`
 * so the PWA works 100% offline after the very first visit (even without an
 * online reload) and automatically invalidates old caches on every deploy.
 */
function swPrecacheManifestPlugin(): Plugin {
  let outDir = 'dist'

  return {
    name: 'kalorishomar-sw-precache',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    closeBundle() {
      const distDir = resolve(outDir)
      const swPath = resolve(distDir, 'sw.js')
      const assetsDir = resolve(distDir, 'assets')
      if (!existsSync(swPath) || !existsSync(assetsDir)) return

      const assetFiles = readdirSync(assetsDir)
        .filter((file) => !file.endsWith('.map'))
        .sort()
        .map((file) => `/assets/${file}`)

      const hash = createHash('sha256')
        .update(assetFiles.join('|'))
        .digest('hex')
        .slice(0, 10)

      const swSource = readFileSync(swPath, 'utf8')
      const injected = swSource
        .replace('__SW_CACHE_VERSION__', `kalorishomar-${hash}`)
        .replace(
          '/* __SW_PRECACHE_ASSETS__ */',
          assetFiles.map((p) => `  ${JSON.stringify(p)},`).join('\n'),
        )

      writeFileSync(swPath, injected, 'utf8')
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), swPrecacheManifestPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/') ||
            id.includes('node_modules/scheduler')
          ) {
            return 'vendor-react'
          }
          if (
            id.includes('node_modules/recharts') ||
            id.includes('node_modules/d3-') ||
            id.includes('node_modules/victory-vendor')
          ) {
            return 'vendor-charts'
          }
          if (id.includes('/src/data/foods/') || id.includes('/src/data/iranianFoods')) {
            return 'food-catalog'
          }
        },
      },
    },
  },
  test: {
    isolate: false,
  },
})
