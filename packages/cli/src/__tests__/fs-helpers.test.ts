import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { ensureDir, writeFile, writeJSON, readJSON, readOptionalFile } from '../fs-helpers.js';

test('ensureDir creates nested directories', async (t) => {
  const dir = await createTempDir(t);
  const nested = path.join(dir, 'deeply', 'nested');
  await ensureDir(nested);
  const stats = await stat(nested);
  assert.ok(stats.isDirectory());
});

test('writeFile writes contents after ensuring directory', async (t) => {
  const dir = await createTempDir(t);
  const filePath = path.join(dir, 'nested', 'file.txt');
  await writeFile(filePath, 'hello world');
  const contents = await readFile(filePath, 'utf8');
  assert.equal(contents, 'hello world');
});

test('writeJSON and readJSON round-trip data', async (t) => {
  const dir = await createTempDir(t);
  const filePath = path.join(dir, 'data.json');
  const payload = { name: 'base-lint', passes: 3 };
  await writeJSON(filePath, payload);
  const result = await readJSON<typeof payload>(filePath);
  assert.deepEqual(result, payload);
});

test('readOptionalFile handles missing and existing files', async (t) => {
  const dir = await createTempDir(t);
  const missingPath = path.join(dir, 'missing.txt');
  const presentPath = path.join(dir, 'present.txt');

  const missing = await readOptionalFile(missingPath);
  assert.equal(missing, null);

  await writeFile(presentPath, 'value');
  const present = await readOptionalFile(presentPath);
  assert.equal(present, 'value');
});

async function createTempDir(t: TestContext) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'base-lint-fs-'));
  t.after(async () => {
    await rm(dir, { recursive: true, force: true });
  });
  return dir;
}
