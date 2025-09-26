import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  minify: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
