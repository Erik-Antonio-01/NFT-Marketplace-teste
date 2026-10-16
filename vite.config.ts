import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { 'socket.io-client-browser': fileURLToPath(new URL('./node_modules/socket.io-client/dist/socket.io.esm.min.js', import.meta.url)) } },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})
