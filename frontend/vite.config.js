import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: process.env.VITE_BUILD_DIR || 'dist',
    emptyOutDir: true, // Allow emptying outDir even when it's outside project root
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8089',
        changeOrigin: true,
        secure: false,
      },
      '/raw': {
        target: 'http://localhost:8089',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
