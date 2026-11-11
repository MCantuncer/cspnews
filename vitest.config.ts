import { defineConfig } from 'vitest/config';

export default defineConfig({
  ssr: {
    resolve: {
      // Resolve workspace packages to their TypeScript source, so tests never need a build first.
      conditions: ['source', 'import', 'node', 'default'],
    },
  },
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
  },
});
