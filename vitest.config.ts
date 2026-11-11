import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Resolve workspace packages to their TypeScript source, so tests never need a build first.
    conditions: ['source'],
  },
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
  },
});
