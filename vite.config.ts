import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets load correctly on GitHub Pages (/Viralhoods/) and custom domains
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
