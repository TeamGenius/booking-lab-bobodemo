import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so the same build works at `/` (Render/Vercel) and under a
// repo sub-path like `/booking-lab-bobodemo/` (GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
})
