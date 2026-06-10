import { resolve } from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: resolve('src/renderer'),
  base: '/',
  build: {
    outDir: resolve('dist/web'),
    emptyOutDir: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          const s = String(id || '')
          if (!s.includes('node_modules')) return undefined
          if (s.includes('vuetify')) return 'vuetify'
          if (s.includes('chart.js') || s.includes('vue-chartjs')) return 'charts'
          if (s.includes('vue-router') || s.includes('/vue/') || s.includes('pinia'))
            return 'vue-vendor'
          if (s.includes('luxon')) return 'datetime'
          return 'vendor'
        }
      }
    }
  },
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src')
    }
  },
  define: {
    __IS_WEB__: 'true',
    __API_BASE_URL__: JSON.stringify(process.env.VITE_API_BASE_URL || 'https://b2b-law-g2qr.onrender.com/api')
  },
  plugins: [vue(), vuetify({ autoImport: true }), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  test: {
    root: resolve('src/renderer'),
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,js}'],
    css: { include: /\.css$/ },
    server: { deps: { inline: ['vuetify'] } }
  }
})
