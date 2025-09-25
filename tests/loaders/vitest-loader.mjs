import { pathToFileURL } from 'node:url';
import path from 'node:path';

const aliasEntries = [
  ['vitest', path.resolve('tests/mocks/vitest.js')],
  ['@actions/core', path.resolve('tests/mocks/@actions/core.js')],
  ['@actions/github', path.resolve('tests/mocks/@actions/github.js')],
];

const aliases = new Map(aliasEntries.map(([key, value]) => [key, pathToFileURL(value).href]));

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
