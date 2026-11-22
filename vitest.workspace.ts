import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: './vite.config.ts',
    test: {
      name: 'unit',
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      exclude: ['src/**/*.browser.test.ts', 'node_modules/**'],
      setupFiles: ['./src/test/setup.ts'],
    },
  },
  {
    extends: './vite.config.ts',
    test: {
      name: 'browser',
      include: ['src/**/*.browser.test.ts'],
      browser: {
        enabled: true,
        provider: 'playwright',
        headless: true,
        name: 'chromium',
        providerOptions: { launch: { executablePath: '/opt/pw-browsers/chromium' } },
      },
    },
  },
]);
