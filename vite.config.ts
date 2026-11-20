import { defineConfig } from 'vite';

export default defineConfig({
  base: '/bbq/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5175,
  },
  preview: {
    host: '127.0.0.1',
    port: 4175,
  },
});
