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
      const isTestFile = entry.isFile() && entry.name.endsWith('.test.ts');
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

  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\u2026/g, '...'));

  const coverageLineIndex = lines.findIndex(
    (line) => line.toLowerCase().startsWith('ℹ all') || line.toLowerCase().startsWith('# all'),
  );

  if (coverageLineIndex === -1) {
    console.error('Coverage summary not found in test output.');
    process.exit(1);
  }

  const parseColumns = (row) =>
    row
      .split('|')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

  let metrics;

  const headerOffset = lines
    .slice(coverageLineIndex + 1)
    .findIndex((line) => {
      const lower = line.toLowerCase();
      const hasFunctionColumn = lower.includes('functions') || lower.includes('funcs');
      return lower.includes('lines') && lower.includes('branches') && hasFunctionColumn && line.includes('|');
    });

  if (headerOffset !== -1) {
    const headerIndex = coverageLineIndex + 1 + headerOffset;
    const dataOffset = lines
      .slice(headerIndex + 1)
      .findIndex((line) => /\d+(?:\.\d+)?%/.test(line));

    if (dataOffset !== -1) {
      const headerColumns = parseColumns(lines[headerIndex]);
      const dataColumns = parseColumns(lines[headerIndex + 1 + dataOffset]);
      const columnMap = {
        lines: headerColumns.findIndex((value) => value.toLowerCase().startsWith('lines')),
        branches: headerColumns.findIndex((value) => value.toLowerCase().startsWith('branches')),
        functions: headerColumns.findIndex((value) => {
          const lower = value.toLowerCase();
          return lower.startsWith('functions') || lower.startsWith('funcs');
        }),
      };

      const parsedMetrics = {};
      let isValid = true;

      for (const [key, columnIndex] of Object.entries(columnMap)) {
        if (columnIndex === -1 || columnIndex >= dataColumns.length) {
          isValid = false;
          break;
        }

        const numeric = Number.parseFloat(dataColumns[columnIndex].replace(/%/g, ''));
        if (Number.isNaN(numeric)) {
          isValid = false;
          break;
        }

        parsedMetrics[key] = numeric;
      }

      if (isValid) {
        metrics = parsedMetrics;
      }
    }
  }

  if (!metrics) {
    const coverageLine = lines[coverageLineIndex];
    const match = coverageLine.match(/\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/);
    if (!match) {
      console.error('Unable to parse coverage percentages from summary line:', coverageLine);
      process.exit(1);
    }

    const [, linePercent, branchPercent, funcPercent] = match;
    metrics = {
      lines: Number.parseFloat(linePercent),
      branches: Number.parseFloat(branchPercent),
      functions: Number.parseFloat(funcPercent),
    };
  }

  const failures = Object.entries(metrics).filter(([, value]) => value < threshold);
  if (failures.length > 0) {
    const message = failures
      .map(([name, value]) => `${name} (${value.toFixed(2)}%)`)
      .join(', ');
    console.error(`Coverage below ${threshold}% for: ${message}`);
    process.exit(1);
  }
});
