#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const threshold = 80;
const testRoots = [
  'packages/cli/src/__tests__',
  'packages/action/src/__tests__',
];

async function collectTestFiles(dir) {
  const absoluteDir = path.resolve(dir);
  let entries;
  try {
    entries = await readdir(absoluteDir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(absoluteDir, entry.name);
      if (entry.isDirectory()) {
        return collectTestFiles(fullPath);
      }
      const isTestFile = entry.isFile() && (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.js'));
      return isTestFile ? [fullPath] : [];
    }),
  );

  return files.flat();
}

const testFiles = (await Promise.all(testRoots.map(collectTestFiles))).flat();

if (testFiles.length === 0) {
  console.error('No unit test files found.');
  process.exit(1);
}

const nodeArgs = [
  '--import',
  'tsx',
  '--test',
  '--experimental-test-coverage',
  '--experimental-test-module-mocks',
  '--experimental-loader',
  path.resolve('tests/loaders/vitest-loader.mjs'),
  ...testFiles,
];

const mockModulePath = path.resolve('tests/mocks');
const env = { ...process.env };
env.NODE_PATH = env.NODE_PATH ? `${mockModulePath}${path.delimiter}${env.NODE_PATH}` : mockModulePath;

const child = spawn(process.execPath, nodeArgs, {
  stdio: ['inherit', 'pipe', 'inherit'],
  env,
});

let stdout = '';

child.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  stdout += text;
  process.stdout.write(text);
});

child.on('error', (error) => {
  console.error('Failed to start unit test runner:', error);
  process.exit(1);
});

child.on('close', (code, signal) => {
  if (signal) {
    console.error(`Unit tests terminated due to signal ${signal}`);
    process.exit(1);
  }
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  const coverageLine = stdout
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\u2026/g, '...'))
    .find((line) => line.toLowerCase().startsWith('ℹ all') || line.toLowerCase().startsWith('# all'));

  if (!coverageLine) {
    console.error('Coverage summary not found in test output.');
    process.exit(1);
  }

  const match = coverageLine.match(/\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/);
  if (!match) {
    console.error('Unable to parse coverage percentages from summary line:', coverageLine);
    process.exit(1);
  }

  const [, linePercent, branchPercent, funcPercent] = match;
  const metrics = {
    lines: Number.parseFloat(linePercent),
    branches: Number.parseFloat(branchPercent),
    functions: Number.parseFloat(funcPercent),
  };

  const failures = Object.entries(metrics).filter(([, value]) => value < threshold);
  if (failures.length > 0) {
    const message = failures
      .map(([name, value]) => `${name} (${value.toFixed(2)}%)`)
      .join(', ');
    console.error(`Coverage below ${threshold}% for: ${message}`);
    process.exit(1);
  }
});
