import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    // Exclude E2E tests from Vitest (they run separately with Playwright)
    exclude: ['node_modules/**', 'test/e2e/**', 'test-results/**', 'playwright-report/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'cobertura'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.test.js',
        '**/*.spec.js',
        'coverage/**',
        'dist/**',
        'playwright.config.ts',
        'vitest.config.js',
        'eslint.config.js',
        '.prettierrc',
        'test-results/**',
      ],
      include: ['static/modules/**/*.js', 'static/app.js'],
      thresholds: {
        branches: 75,
        functions: 35,
        lines: 50,
        statements: 50,
      },
      clean: true,
      reportsDirectory: './coverage',
      all: true,
    },
  },
  resolve: {
    alias: {
      '@': '/static/modules',
    },
  },
});
