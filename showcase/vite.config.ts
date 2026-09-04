import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: here('./'),
  base: './',
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@/components/remotion',
        replacement: here('../registry/default/primitives'),
      },
      {
        find: '@/lib/remotion',
        replacement: here('../registry/default/lib'),
      },
    ],
  },
  build: {
    outDir: here('../dist'),
    emptyOutDir: true,
  },
});
