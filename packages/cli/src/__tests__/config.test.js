import { afterEach, expect, test } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const tempDirs = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

test('resolveConfig returns defaults when no config file is present', async () => {
  const cwd = await createTempDir();
  const { resolveConfig } = await import('../config.ts');

  const result = await resolveConfig(cwd, {});

  expect(result.config.mode).toBe('diff');
  expect(result.config.treatNewlyAs).toBe('warn');
  expect(result.config.strict).toBe(false);
  expect(result.configPath).toBeUndefined();
  expect(result.ignorePatterns).toEqual([
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.min.js',
  ]);
  expect(result.includePatterns).toEqual([]);
});

test('resolveConfig merges file settings, ignore files, and CLI overrides', async () => {
  const cwd = await createTempDir();
  await writeFile(
    path.join(cwd, 'base-lint.config.json'),
    JSON.stringify(
      {
        mode: 'repo',
        strict: false,
        treatNewlyAs: 'ignore',
        suppress: ['css-grid'],
        include: ['src/**/*.ts'],
        ignore: ['dist/'],
        maxLimited: 3,
      },
      null,
      2,
    ),
    'utf8',
  );
  await writeFile(path.join(cwd, '.base-lintignore'), '# comment\ncustom-ignore/\n', 'utf8');

  const { resolveConfig } = await import('../config.ts');
  const result = await resolveConfig(cwd, { mode: 'diff', strict: true, treatNewly: 'error' });

  expect(result.config.mode).toBe('diff');
  expect(result.config.strict).toBe(true);
  expect(result.config.treatNewlyAs).toBe('error');
  expect(result.config.maxLimited).toBe(3);
  expect(result.config.suppress).toEqual(['css-grid']);
  expect(result.config.include).toEqual(['src/**/*.ts']);
  expect(result.ignorePatterns).toEqual([
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.min.js',
    'custom-ignore/',
  ]);
  expect(result.configPath).toBe(path.join(cwd, 'base-lint.config.json'));
});

test('resolveConfig validates CLI options and reports missing files', async () => {
  const cwd = await createTempDir();
  const { resolveConfig } = await import('../config.ts');

  await expect(resolveConfig(cwd, { mode: 'invalid' })).rejects.toThrow(/Unsupported mode/);
  await expect(resolveConfig(cwd, { treatNewly: 'oops' })).rejects.toThrow(/Unsupported treat-newly option/);
  await expect(resolveConfig(cwd, { config: 'missing.json' })).rejects.toThrow(/Config file not found/);
});

async function createTempDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'base-lint-config-'));
  tempDirs.push(dir);
  return dir;
}
