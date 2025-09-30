#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const testRoot = 'tests/e2e';

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
      const isTestFile =
        entry.isFile() &&
        (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.js') || entry.name.endsWith('.test.mjs'));
      return isTestFile ? [fullPath] : [];
    }),
  );

  return files.flat();
}

const testFiles = await collectTestFiles(testRoot);

if (testFiles.length === 0) {
  console.error('No end-to-end test files found.');
  process.exit(1);
}

const { register: moduleRegister } = await import('node:module').catch(() => ({ register: undefined }));
const supportsModuleRegister = typeof moduleRegister === 'function';

const tsxImport = pathToFileURL(path.resolve('node_modules/tsx/dist/esm/index.mjs')).href;
const loaderPath = path.resolve('tests/loaders/e2e-loader.mjs');

const createRegisterImport = (targetLoaderPath) => {
  const source = [
    "import { register } from 'node:module';",
    "import { pathToFileURL } from 'node:url';",
    `register(${JSON.stringify(targetLoaderPath)}, pathToFileURL('./'));`,
  ].join('\n');
  return `data:text/javascript,${encodeURIComponent(source)}`;
};

const nodeArgs = [
  '--import',
  tsxImport,
  ...(supportsModuleRegister
    ? ['--import', createRegisterImport(loaderPath)]
    : ['--experimental-loader', loaderPath]),
  '--test',
  '--experimental-test-coverage',
  ...testFiles,
];

const mockModulePath = path.resolve('tests/mocks');
const env = { ...process.env };
env.NODE_PATH = env.NODE_PATH ? `${mockModulePath}${path.delimiter}${env.NODE_PATH}` : mockModulePath;

const child = spawn(process.execPath, nodeArgs, {
  stdio: ['inherit', 'pipe', 'inherit'],
  env,
});

child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
});

child.on('error', (error) => {
  console.error('Failed to start e2e test runner:', error);
  process.exit(1);
});

child.on('close', (code, signal) => {
  if (signal) {
    console.error(`E2E tests terminated due to signal ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
