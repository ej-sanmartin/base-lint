import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const loaderDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(loaderDir, '../..');

const aliasEntries = [
  ['vitest', path.join(repoRoot, 'tests/mocks/vitest.js')],
  ['@actions/core', path.join(repoRoot, 'tests/mocks/@actions/core.js')],
  ['@actions/github', path.join(repoRoot, 'tests/mocks/@actions/github.js')],
  ['globby', path.join(repoRoot, 'tests/mocks/globby.js')],
  ['minimatch', path.join(repoRoot, 'tests/mocks/minimatch.js')],
  ['ignore', path.join(repoRoot, 'tests/mocks/ignore.js')],
  ['web-features/package.json', path.join(repoRoot, 'tests/mocks/web-features/package.json')],
  ['web-features/data/features.json', path.join(repoRoot, 'tests/mocks/web-features/data/features.json')],
];

const aliases = new Map(aliasEntries.map(([specifier, target]) => [specifier, pathToFileURL(target).href]));

export async function resolve(specifier, context, nextResolve) {
  const mapped = aliases.get(specifier);
  if (mapped) {
    return {
      shortCircuit: true,
      url: mapped,
    };
  }
  return nextResolve(specifier, context);
}
