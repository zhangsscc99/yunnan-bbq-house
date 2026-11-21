import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

function buildId(): string {
  let sha = 'dev';
  try {
    sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'dev';
  } catch {
    return 'dev';
  }
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  return `${sha}-${stamp}`;
}

export default defineConfig({
  base: '/bbq/',
  define: { __BUILD__: JSON.stringify(buildId()) },
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
