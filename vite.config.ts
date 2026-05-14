import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
      // Alias @assets to the src/assets directory
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  server: {
    headers: {
      // Allow YouTube and YouTube no-cookie iframes + autoplay
      'Content-Security-Policy':
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://www.youtube-nocookie.com; " +
        "frame-src https://www.youtube.com https://www.youtube-nocookie.com; " +
        "img-src 'self' data: blob: https:; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "connect-src 'self' http://localhost:8000;",
      'Permissions-Policy': 'autoplay=*, fullscreen=*',
    },
  },
})
