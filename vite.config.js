import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',           // si tu app estará en subcarpeta, cámbialo
  build: { target: 'es2018', sourcemap: false, emptyOutDir: true, outDir: 'dist' }
});
