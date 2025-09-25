import { afterEach, expect, test } from 'vitest';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { ensureDir, writeFile, writeJSON, readJSON, readOptionalFile } from '../fs-helpers.ts';

const tempDirs = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

test('ensureDir creates nested directories', async () => {
  const dir = await createTempDir();
  const nested = path.join(dir, 'deeply', 'nested');
  await ensureDir(nested);
  const stats = await stat(nested);
  expect(stats.isDirectory()).toBe(true);
});

test('writeFile writes contents after ensuring directory', async () => {
  const dir = await createTempDir();
  const filePath = path.join(dir, 'nested', 'file.txt');
  await writeFile(filePath, 'hello world');
  const contents = await readFile(filePath, 'utf8');
  expect(contents).toBe('hello world');
});

test('writeJSON and readJSON round-trip data', async () => {
  const dir = await createTempDir();
  const filePath = path.join(dir, 'data.json');
  const payload = { name: 'base-lint', passes: 3 };
  await writeJSON(filePath, payload);
  const result = await readJSON(filePath);
  expect(result).toEqual(payload);
});

test('readOptionalFile handles missing and existing files', async () => {
  const dir = await createTempDir();
  const missingPath = path.join(dir, 'missing.txt');
  const presentPath = path.join(dir, 'present.txt');

  const missing = await readOptionalFile(missingPath);
  expect(missing).toBeNull();

  await writeFile(presentPath, 'value');
  const present = await readOptionalFile(presentPath);
  expect(present).toBe('value');
});

async function createTempDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'base-lint-fs-'));
  tempDirs.push(dir);
  return dir;
}
