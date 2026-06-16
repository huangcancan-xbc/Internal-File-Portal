import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Request uncompressed response from backend
            proxyReq.setHeader('Accept-Encoding', 'identity')
            // Forward real client IP to backend
            const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
            if (clientIp) {
              proxyReq.setHeader('X-Forwarded-For', clientIp.replace(/^::ffff:/, ''))
            }
          })
          proxy.on('proxyRes', (proxyRes) => {
            // Remove encoding headers to prevent browser decompression mismatch
            delete proxyRes.headers['content-encoding']
            delete proxyRes.headers['content-length']
          })
        }
      }
    }
  }
})
