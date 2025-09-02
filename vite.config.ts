import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: true,
    strictPort: false, // Allow trying another port if in use
    fs: {
      // Allow serving files from the parent directory (tests folder)
      allow: ['..']
    }
  },
  publicDir: 'public', // Enable automatic public directory serving
  define: {
    // Add environment variable for development
    __DEV__: true
  }
})