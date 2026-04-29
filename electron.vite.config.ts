import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { target: 'node20' },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: { target: 'node20' },
  },
  renderer: {
    server: {
      host: '0.0.0.0',   // listen on all interfaces so LAN devices can reach the dev server
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src'),
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    plugins: [react()],
  },
})
