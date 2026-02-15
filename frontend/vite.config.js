import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Enable top-level await for WASM modules
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
    // Exclude WASM-heavy packages from pre-bundling
    exclude: [
      '@noir-lang/noir_js',
      '@noir-lang/noirc_abi',
      '@noir-lang/acvm_js',
      '@aztec/bb.js',
    ],
  },
  build: {
    target: 'esnext',
  },
  server: {
    // Proxy CRS requests to Aztec CDN (avoids CORS issues in dev)
    proxy: {
      '/api/crs': {
        target: 'https://crs.aztec.network',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/crs/, ''),
        secure: true,
      },
    },
    headers: {
      // Required for SharedArrayBuffer (used by bb.js multithreading)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
