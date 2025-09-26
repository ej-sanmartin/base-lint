import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createWorkspace, createActionSpawner, runCli } from './helpers.js';
import { runBaseLint } from '../../packages/action/src/index.ts';

test('runBaseLint orchestrates scan and enforce using the CLI', async (t) => {
  const { workspace, cleanup } = await createWorkspace({
    'src/app.js': 'navigator.usb.requestDevice({ filters: [] });\n',
    'src/styles.css': '.card:has(.cta) { color: red; }\n',
  });
  t.after(cleanup);

  const logs = [];
  const spawn = createActionSpawner(workspace);
  const core = {
    info: (message) => {
      logs.push(message);
    },
  };

  await runBaseLint(
    ['scan', '--mode', 'repo', '--out', '.base-lint-report', '--treat-newly', 'warn'],
    { core, spawn },
  );

  assert.ok(logs.some((line) => line.includes('scan --mode repo')));

  const reportPath = path.join('.base-lint-report', 'report.json');

  await runBaseLint(['enforce', '--input', reportPath, '--max-limited', '0'], { core, spawn });

  await runBaseLint(['enforce', '--input', reportPath, '--max-limited', '1'], { core, spawn });

  const report = JSON.parse(
    await readFile(path.join(workspace, '.base-lint-report', 'report.json'), 'utf8'),
  );
  assert.equal(report.summary.limited, 0);
  assert.equal(report.summary.newly, 0);
  assert.equal(report.summary.widely, 2);

  // Sanity check: running the CLI directly with the same workspace still succeeds.
  await runCli(
    ['scan', '--mode', 'repo', '--out', '.base-lint-report-2', '--treat-newly', 'warn'],
    { cwd: workspace },
  );
});
