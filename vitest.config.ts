import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Unit-test config. Kept separate from vite.config.ts so the PWA/build plugins
 * don't run under the test harness. Node environment is enough for the pure
 * logic we test today (formatters, zone/cover-page helpers); switch to 'jsdom'
 * if/when we add component tests.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
