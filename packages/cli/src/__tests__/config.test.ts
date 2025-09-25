import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('resolveConfig returns defaults when no config file is present', async (t) => {
  const cwd = await createTempDir(t);
  const { resolveConfig } = await import('../config.js');

  const result = await resolveConfig(cwd, {});

  assert.equal(result.config.mode, 'diff');
  assert.equal(result.config.treatNewlyAs, 'warn');
  assert.equal(result.config.strict, false);
  assert.equal(result.configPath, undefined);
  assert.deepEqual(result.ignorePatterns, ['node_modules/', 'dist/', 'build/', 'coverage/', '*.min.js']);
  assert.deepEqual(result.includePatterns, []);
});

test('resolveConfig merges file settings, ignore files, and CLI overrides', async (t) => {
  const cwd = await createTempDir(t);
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

  const { resolveConfig } = await import('../config.js');
  const result = await resolveConfig(cwd, { mode: 'diff', strict: true, treatNewly: 'error' });

  assert.equal(result.config.mode, 'diff');
  assert.equal(result.config.strict, true);
  assert.equal(result.config.treatNewlyAs, 'error');
  assert.equal(result.config.maxLimited, 3);
  assert.deepEqual(result.config.suppress, ['css-grid']);
  assert.deepEqual(result.config.include, ['src/**/*.ts']);
  assert.deepEqual(result.ignorePatterns, ['node_modules/', 'dist/', 'build/', 'coverage/', '*.min.js', 'custom-ignore/']);
  assert.equal(result.configPath, path.join(cwd, 'base-lint.config.json'));
});

test('resolveConfig validates CLI options and reports missing files', async (t) => {
  const cwd = await createTempDir(t);
  const { resolveConfig } = await import('../config.js');

  await assert.rejects(resolveConfig(cwd, { mode: 'invalid' }), /Unsupported mode/);
  await assert.rejects(resolveConfig(cwd, { treatNewly: 'oops' }), /Unsupported treat-newly option/);
  await assert.rejects(resolveConfig(cwd, { config: 'missing.json' }), /Config file not found/);
});

async function createTempDir(t: TestContext): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'base-lint-config-'));
  t.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });
  return dir;
}
