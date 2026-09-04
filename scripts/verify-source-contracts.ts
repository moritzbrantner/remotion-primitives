import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const registryRoot = join(root, 'registry', 'default');
const errors: string[] = [];

const forbiddenDeterminismSources = [
  'Math.random(',
  'Date.now(',
  'performance.now(',
  'crypto.getRandomValues(',
];

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
    }),
  );
  return nested.flat();
}

for (const path of await sourceFiles(registryRoot)) {
  const source = await readFile(path, 'utf8');
  for (const forbidden of forbiddenDeterminismSources) {
    if (source.includes(forbidden)) {
      errors.push(`${path.slice(root.length + 1)} uses forbidden nondeterministic source ${forbidden}`);
    }
  }
}

const subtitleParserPath = join(registryRoot, 'lib', 'subtitle-formats.ts');
const subtitleParser = await readFile(subtitleParserPath, 'utf8');
const subtitleImports = [...subtitleParser.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(
  (match) => match[1],
);
for (const dependency of subtitleImports) {
  if (dependency === 'react' || dependency === 'remotion' || dependency.startsWith('@remotion/')) {
    errors.push(`subtitle-formats must remain runtime-neutral, but imports ${dependency}`);
  }
}

const manifestPath = join(registryRoot, 'registry.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
  items: Array<{
    name: string;
    type: string;
    files?: Array<{ type: string; target?: string }>;
    registryDependencies?: string[];
  }>;
};

for (const item of manifest.items) {
  for (const file of item.files ?? []) {
    const expectedPrefix = file.type === 'registry:lib' ? '@lib/remotion/' : '@components/remotion/';
    if (!file.target?.startsWith(expectedPrefix)) {
      errors.push(`${item.name} must target ${expectedPrefix}`);
    }
  }
  for (const dependency of item.registryDependencies ?? []) {
    if (!dependency.startsWith('moritzbrantner/remotion-primitives/')) {
      errors.push(`${item.name} has an out-of-repository registry dependency: ${dependency}`);
    }
  }
}

if (errors.length > 0) {
  throw new Error(`Source contract verification failed:\n- ${errors.join('\n- ')}`);
}

console.log(`Verified determinism, subtitle ownership, and ${manifest.items.length} registry items.`);
