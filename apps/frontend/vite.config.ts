import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 5190: 5173 and 5180 are taken by other projects on this machine.
  // strictPort so it never jumps to another port — the backend only accepts this origin.
  server: { port: 5190, strictPort: true },
})
