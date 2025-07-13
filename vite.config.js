import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'buffer-polyfill',
      transformIndexHtml: {
        enforce: 'pre',
        transform(html) {
          return html.replace(
            '<head>',
            '<head>\n  <script>window.global = window;</script>\n  <script type="module">import { Buffer } from "buffer"; window.Buffer = Buffer;</script>'
          )
        }
      }
    }
  ],
  server: {
    fs: {
      allow: ['..']
    }
  },
  define: {
    global: 'globalThis',
    __dirname: JSON.stringify('/'),
    'process.env': {}
  },
  optimizeDeps: {
    include: ['@hyzyla/pdfium', 'buffer', 'util', 'events', 'stream-browserify']
  },
  resolve: {
    alias: {
      path: 'path-browserify',
      url: 'url-polyfill',
      fs: 'browserify-fs',
      util: 'util',
      events: 'events',
      stream: 'stream-browserify'
    }
  },
  assetsInclude: ['**/*.wasm'],
  build: {
    rollupOptions: {
      external: [],
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.wasm')) {
            return '[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js', 'tests/**/*.spec.js'],
    exclude: ['tests/e2e/**/*'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*'],
      exclude: ['src/main.js']
    }
  }
})