import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Lists every built asset in precache-manifest.json, which the service worker
 * (public/sw.js) caches so each screen opens offline, even one never visited.
 */
function precacheManifest(): Plugin {
  return {
    name: 'sp-precache-manifest',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle)
        .filter((name) => name.startsWith('assets/') && !name.endsWith('.map'))
        .sort()
        .map((name) => `/${name}`)
      this.emitFile({ type: 'asset', fileName: 'precache-manifest.json', source: JSON.stringify({ files }) })
    },
  }
}

/**
 * The dev server proxies /api and /media to the backend named by VITE_API_BASE_URL
 * (default: local Django) so its HttpOnly auth cookies stay same-origin. The build
 * splits vendors into long-lived chunks so app updates keep library caches valid.
 */
export default defineConfig(({ mode }) => {
  const apiUrl = loadEnv(mode, process.cwd(), '').VITE_API_BASE_URL ?? ''
  const backend = /^https?:\/\//.test(apiUrl) ? new URL(apiUrl).origin : 'http://127.0.0.1:8000'

  return {
    plugins: [react(), tailwindcss(), precacheManifest()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'react', test: /node_modules[\/](react|react-dom|scheduler)[\/]/ },
              { name: 'router', test: /node_modules[\/]react-router/ },
              { name: 'motion', test: /node_modules[\/](motion|framer-motion|motion-dom|motion-utils)[\/]/ },
            ],
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': { target: backend, changeOrigin: true },
        '/media': { target: backend, changeOrigin: true },
      },
    },
  }
})
