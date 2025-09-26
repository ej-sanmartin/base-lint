import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptsDir, '..');
const packageDir = path.join(rootDir, 'packages', 'action');
const distDir = path.join(packageDir, 'dist');
const templatesDir = path.join(scriptsDir, 'templates');

const coreModuleSource = await fs.readFile(path.join(templatesDir, 'actions-core.ts'), 'utf8');
const githubModuleSource = await fs.readFile(path.join(templatesDir, 'actions-github.ts'), 'utf8');

await fs.rm(distDir, { recursive: true, force: true });
await fs.mkdir(distDir, { recursive: true });

await build({
  entryPoints: [path.join(packageDir, 'src', 'index.ts')],
  bundle: true,
  platform: 'node',
  target: ['node18'],
  outfile: path.join(distDir, 'index.js'),
  sourcemap: false,
  plugins: [
    {
      name: 'virtual-actions-modules',
      setup(build) {
        build.onResolve({ filter: /^@actions\/core$/ }, () => ({ path: '@actions/core', namespace: 'virtual' }));
        build.onResolve({ filter: /^@actions\/github$/ }, () => ({ path: '@actions/github', namespace: 'virtual' }));
        build.onLoad({ filter: /^@actions\/core$/, namespace: 'virtual' }, () => ({
          contents: coreModuleSource,
          loader: 'ts',
        }));
        build.onLoad({ filter: /^@actions\/github$/, namespace: 'virtual' }, () => ({
          contents: githubModuleSource,
          loader: 'ts',
        }));
      },
    },
  ],
  logLevel: 'info',
});
