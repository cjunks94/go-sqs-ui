import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
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
        'test-results/**'
      ],
      include: [
        'static/modules/**/*.js',
        'static/app.js'
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 85,
        statements: 85
      },
      clean: true,
      reportsDirectory: './coverage',
      all: true
    }
  },
  resolve: {
    alias: {
      '@': '/static/modules'
    }
  }
});