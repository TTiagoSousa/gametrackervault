import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 5190: o 5173 e o 5180 estão ocupados por outros projetos nesta máquina.
  // strictPort para nunca saltar para outra porta — o backend só aceita esta origem.
  server: { port: 5190, strictPort: true },
})
