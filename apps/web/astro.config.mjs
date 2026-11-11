import { defineConfig } from 'astro/config';

// A static site: every bulletin is built into plain pages when it is published (see docs/design/system.md).
export default defineConfig({
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  vite: {
    resolve: {
      // Use workspace packages' TypeScript source, so the site builds without building them first.
      conditions: ['source'],
    },
  },
});
