import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspace, runCli } from './helpers.js';
import { DEFAULT_REPORT_PATH } from '../../packages/cli/src/constants.ts';

test('enforce succeeds with default report path after scan', async (t) => {
  const { workspace, cleanup } = await createWorkspace({
    'src/app.js': 'navigator.usb.requestDevice({ filters: [] });\n',
  });
  t.after(cleanup);

  await runCli(['scan', '--mode', 'repo'], { cwd: workspace });

  const output = await runCli(['enforce', '--max-limited', '1'], { cwd: workspace });

  assert.ok(
    output.stdout.includes('Baseline policy satisfied.'),
    'enforce should confirm the policy was satisfied',
  );
});

test('enforce prints guidance when default report is missing', async (t) => {
  const { workspace, cleanup } = await createWorkspace({});
  t.after(cleanup);

  await assert.rejects(
    runCli(['enforce'], { cwd: workspace }),
    (error) => {
      assert.equal(error.message, 'enforce command exited with code 1');
      assert.ok(error.output, 'output should be attached to the error');
      assert.ok(
        error.output.stderr.includes(
          `[base-lint] No report found at ${DEFAULT_REPORT_PATH} — run \`base-lint scan\` first or pass --input`,
        ),
        'stderr should include the missing report guidance',
      );
      return true;
    },
  );
});
