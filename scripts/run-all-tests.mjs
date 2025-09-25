#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const coverageDir = path.resolve('.coverage');
const scripts = [
  { name: 'unit', path: path.resolve('scripts/run-unit-tests.mjs') },
  { name: 'e2e', path: path.resolve('scripts/run-e2e-tests.mjs') },
];

async function cleanCoverage() {
  try {
    await rm(coverageDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Failed to reset coverage output:', error);
    process.exit(1);
  }
}

function runScript({ name, path: scriptPath }, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: 'inherit',
      env,
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to start ${name} tests: ${error.message}`));
    });

    child.on('close', (code, signal) => {
      if (signal) {
        reject(new Error(`${name} tests terminated due to signal ${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${name} tests exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

async function main() {
  await cleanCoverage();
  const env = { ...process.env, NODE_V8_COVERAGE: coverageDir };

  for (const script of scripts) {
    await runScript(script, env);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
