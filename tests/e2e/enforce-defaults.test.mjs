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

test('enforce exits with code 2 when Newly findings are treated as errors', async (t) => {
  const { workspace, cleanup } = await createWorkspace({
    'src/styles.css': '.card:has(.cta) { color: red; }\n',
  });
  t.after(cleanup);

  await runCli(['scan', '--mode', 'repo'], { cwd: workspace });

  await assert.rejects(
    runCli(['enforce', '--fail-on-warn'], { cwd: workspace }),
    (error) => {
      assert.equal(error.message, 'enforce command exited with code 2');
      assert.ok(
        error.output.stderr.includes(
          '[base-lint] Newly findings (1) are treated as errors by policy.',
        ),
        'stderr should describe the Newly failure',
      );
      return true;
    },
  );
});

test('enforce prints guidance when default report is missing', async (t) => {
  const { workspace, cleanup } = await createWorkspace({});
  t.after(cleanup);

  await assert.rejects(
    runCli(['enforce'], { cwd: workspace }),
    (error) => {
      assert.equal(error.message, 'enforce command exited with code 3');
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
