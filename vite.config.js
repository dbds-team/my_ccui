import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  
  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT) || 3001,
      proxy: {
        '/api': `http://localhost:${env.PORT || 3002}`,
        '/ws': {
          target: `ws://localhost:${env.PORT || 3002}`,
          ws: true
        }
      }
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            xterm: ['xterm', 'xterm-addon-fit'],
            codemirror: ['@uiw/react-codemirror', '@codemirror/lang-javascript', '@codemirror/lang-css', '@codemirror/lang-html', '@codemirror/lang-json', '@codemirror/lang-markdown', '@codemirror/lang-python'],
            capacitor: ['@capacitor/core', '@capacitor/app', '@capacitor/device', '@capacitor/network', '@capacitor/preferences', '@capacitor/status-bar', '@capacitor/splash-screen', '@capacitor/haptics']
          }
        }
      },
      target: 'es2015'
    },
    optimizeDeps: {
      include: ['@capacitor/core', '@capacitor/app', '@capacitor/device']
    }
  }
})