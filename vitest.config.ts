import { fileURLToPath } from 'node:url';

import { configDefaults, defineConfig } from 'vitest/config';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, '.upstream/**'],
  },
  resolve: {
    alias: [
      { find: '@/components/remotion', replacement: here('./registry/default/primitives') },
      { find: '@/lib/remotion', replacement: here('./registry/default/lib') },
    ],
  },
});
