import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // В продакшене tg-miniapp отдаётся по пути /tg/,
  // поэтому базовый путь для ассетов должен быть /tg/.
  base: '/tg/',
})
