import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Принудительно прописываем ключи для сборщика
process.env.VITE_SUPABASE_URL = 'https://cwrcbzltkdptknnadzuy.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3cmNiemx0a2RwdGtubmFkenV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzY2MzUsImV4cCI6MjA4ODc1MjYzNX0.s6ZaTDgMFC7EQKWcN10b8t3BLF2I3jf66EdKUhmtRZc'

export default defineConfig({
    plugins: [react()],
    base: '/my-cool-site-/', // Твой репозиторий
})