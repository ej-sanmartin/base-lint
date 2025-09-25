import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createWorkspace, runCli } from './helpers.js';

const JS_SAMPLE = `navigator.usb.requestDevice({ filters: [] });\n`;
const CSS_SAMPLE = `.card:has(.cta) {\n  color: red;\n}\n`;

test('scan command generates baseline reports in repo mode', async (t) => {
  const { workspace, cleanup } = await createWorkspace({
    'src/app.js': JS_SAMPLE,
    'src/styles.css': CSS_SAMPLE,
  });
  t.after(cleanup);

  await runCli(
    ['scan', '--mode', 'repo', '--out', '.base-lint-report', '--treat-newly', 'warn'],
    { cwd: workspace },
  );

  const reportDir = path.join(workspace, '.base-lint-report');
  const report = JSON.parse(await readFile(path.join(reportDir, 'report.json'), 'utf8'));
  assert.equal(report.summary.total, 2);
  assert.equal(report.summary.limited, 1);
  assert.equal(report.summary.newly, 1);
  assert.equal(report.summary.widely, 0);
  assert.deepEqual(
    report.findings.map((finding) => ({ featureId: finding.featureId, baseline: finding.baseline })),
    [
      { featureId: 'web.usb', baseline: 'limited' },
      { featureId: 'css.has-selector', baseline: 'newly' },
    ],
  );

  const meta = JSON.parse(await readFile(path.join(reportDir, 'meta.json'), 'utf8'));
  assert.equal(meta.config.mode, 'repo');
  assert.equal(meta.config.treatNewlyAs, 'warn');
  assert.deepEqual(meta.filesAnalyzed.sort(), ['src/app.js', 'src/styles.css']);

  const markdown = await readFile(path.join(reportDir, 'report.md'), 'utf8');
  assert.ok(markdown.includes('WebUSB API'));
  assert.ok(markdown.includes(':has() selector'));
});
