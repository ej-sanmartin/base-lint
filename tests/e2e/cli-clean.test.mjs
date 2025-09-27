import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { createWorkspace, runCli, REPORT_DIRECTORY } from './helpers.js';
import { DEFAULT_REPORT_DIRECTORY } from '../../packages/cli/src/constants.ts';

const SAMPLE_REPORT = '{"summary": {"total": 0}}\n';

test('clean command removes the default report directory', async (t) => {
  const { workspace, cleanup } = await createWorkspace({});
  t.after(cleanup);

  const reportDir = path.join(workspace, DEFAULT_REPORT_DIRECTORY);
  await mkdir(reportDir, { recursive: true });
  await writeFile(path.join(reportDir, 'report.json'), SAMPLE_REPORT);

  assert.equal(
    DEFAULT_REPORT_DIRECTORY,
    REPORT_DIRECTORY,
    'helpers should ignore the same report directory as the CLI default',
  );

  const result = await runCli(['clean'], { cwd: workspace });

  assert.ok(
    result.stdout.includes('Removed report directory'),
    'clean command should log a removal message',
  );

  await assert.rejects(async () => {
    await access(reportDir);
  });

  const secondRun = await runCli(['clean'], { cwd: workspace });
  assert.ok(secondRun.stdout.includes('Removed report directory'));
});
