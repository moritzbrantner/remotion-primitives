import { spawn, spawnSync } from 'node:child_process';
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const repository = 'moritzbrantner/remotion-primitives';
const consumer = await mkdtemp(join(tmpdir(), 'remotion-primitives-dogfood-'));

const requestedItems = ['blur-reveal', 'subtitle-file', 'animated-number', 'typewriter'];
const dependencyItems = ['fade', 'blur', 'subtitles', 'subtitle-formats'];

const expectedCopies = new Map([
  ['registry/default/primitives/blur-reveal.tsx', 'src/components/remotion/blur-reveal.tsx'],
  ['registry/default/primitives/fade.tsx', 'src/components/remotion/fade.tsx'],
  ['registry/default/primitives/blur.tsx', 'src/components/remotion/blur.tsx'],
  ['registry/default/primitives/subtitle-file.tsx', 'src/components/remotion/subtitle-file.tsx'],
  ['registry/default/primitives/subtitles.tsx', 'src/components/remotion/subtitles.tsx'],
  ['registry/default/lib/subtitle-formats.ts', 'src/lib/remotion/subtitle-formats.ts'],
  ['registry/default/primitives/animated-number.tsx', 'src/components/remotion/animated-number.tsx'],
  ['registry/default/primitives/typewriter.tsx', 'src/components/remotion/typewriter.tsx'],
]);

function currentRef() {
  if (process.env.REGISTRY_REF) return process.env.REGISTRY_REF;
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Unable to resolve current git commit: ${result.stderr}`);
  }
  return result.stdout.trim();
}

async function run(command: string[], cwd: string) {
  console.log(`$ ${command.join(' ')}`);
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {
      cwd,
      env: process.env,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command.join(' ')} exited with ${code ?? 'no exit code'}`));
    });
  });
}

async function listFiles(directory: string, relative = ''): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const nextRelative = join(relative, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(join(directory, entry.name), nextRelative)));
    else files.push(nextRelative);
  }
  return files.sort();
}

async function assertExists(relativePath: string) {
  try {
    await access(join(consumer, relativePath));
  } catch {
    throw new Error(`Registry install did not create ${relativePath}`);
  }
}

async function assertExactCopy(sourcePath: string, consumerPath: string) {
  const [source, installed] = await Promise.all([
    readFile(join(root, sourcePath), 'utf8'),
    readFile(join(consumer, consumerPath), 'utf8'),
  ]);
  if (installed !== source) {
    throw new Error(`${consumerPath} is not an exact source copy of ${sourcePath}`);
  }
}

const ref = currentRef();
const address = (item: string) => `${repository}/${item}#${ref}`;

let succeeded = false;
try {
  await mkdir(join(consumer, 'src'), { recursive: true });
  await Promise.all([
    writeFile(
      join(consumer, 'package.json'),
      `${JSON.stringify(
        {
          name: 'remotion-primitives-dogfood-consumer',
          private: true,
          type: 'module',
          packageManager: 'bun@1.4.0',
          dependencies: {
            react: '19.2.8',
            'react-dom': '19.2.8',
          },
          devDependencies: {
            '@types/react': '19.2.18',
            '@types/react-dom': '19.2.7',
            typescript: '6.0.2',
          },
        },
        null,
        2,
      )}\n`,
    ),
    writeFile(
      join(consumer, 'components.json'),
      `${JSON.stringify(
        {
          $schema: 'https://ui.shadcn.com/schema.json',
          style: 'new-york',
          rsc: false,
          tsx: true,
          tailwind: {
            config: '',
            css: 'src/index.css',
            baseColor: 'neutral',
            cssVariables: true,
            prefix: '',
          },
          iconLibrary: 'lucide',
          aliases: {
            components: '@/components',
            utils: '@/lib/utils',
            ui: '@/components/ui',
            lib: '@/lib',
            hooks: '@/hooks',
          },
        },
        null,
        2,
      )}\n`,
    ),
    writeFile(
      join(consumer, 'tsconfig.json'),
      `${JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2022',
            lib: ['DOM', 'ES2022'],
            module: 'ESNext',
            moduleResolution: 'Bundler',
            jsx: 'react-jsx',
            strict: true,
            noEmit: true,
            skipLibCheck: true,
            baseUrl: '.',
            paths: { '@/*': ['./src/*'] },
          },
          include: ['src/**/*.ts', 'src/**/*.tsx'],
        },
        null,
        2,
      )}\n`,
    ),
    writeFile(join(consumer, 'src/index.css'), ''),
  ]);

  console.log(`Dogfooding ${repository} at ${ref}`);
  await run(['bun', 'install'], consumer);

  await run(
    ['bunx', 'shadcn@4.18.0', 'add', '--yes', '--overwrite', ...requestedItems.map(address)],
    consumer,
  );

  for (const consumerPath of expectedCopies.values()) await assertExists(consumerPath);

  // GitHub registry refs are not inherited by registryDependencies. Reinstall dependency items
  // at the exact tested ref so final source fingerprinting and compilation cover one commit.
  await run(
    ['bunx', 'shadcn@4.18.0', 'add', '--yes', '--overwrite', ...dependencyItems.map(address)],
    consumer,
  );

  for (const [sourcePath, consumerPath] of expectedCopies) {
    await assertExactCopy(sourcePath, consumerPath);
  }

  const packageJson = JSON.parse(await readFile(join(consumer, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const installedDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
  for (const dependency of ['remotion', '@remotion/captions']) {
    if (!installedDependencies[dependency]) {
      throw new Error(`Registry install did not add ${dependency} to the consumer package`);
    }
  }

  await writeFile(
    join(consumer, 'src/smoke.tsx'),
    `import { AbsoluteFill } from 'remotion';\n\nimport { AnimatedNumber } from '@/components/remotion/animated-number';\nimport { BlurReveal } from '@/components/remotion/blur-reveal';\nimport { Fade } from '@/components/remotion/fade';\nimport { SubtitleFile } from '@/components/remotion/subtitle-file';\nimport { Typewriter } from '@/components/remotion/typewriter';\n\nexport function RegistryConsumerSmoke() {\n  return (\n    <AbsoluteFill>\n      <Fade><BlurReveal text="dogfood" /></Fade>\n      <AnimatedNumber to={100} suffix="%" />\n      <Typewriter text="registry" />\n      <SubtitleFile src="/captions.srt" />\n    </AbsoluteFill>\n  );\n}\n`,
  );

  await run(['bun', 'run', 'tsc', '--noEmit', '-p', 'tsconfig.json'], consumer);
  console.log(`Dogfood passed: ${expectedCopies.size} source copies installed and consumer type-check succeeded.`);
  succeeded = true;
} finally {
  if (!succeeded) {
    try {
      console.error(`Dogfood consumer files:\n${(await listFiles(consumer)).join('\n')}`);
    } catch {
      // Preserve the original failure when diagnostic listing also fails.
    }
  }
  await rm(consumer, { recursive: true, force: true });
}
