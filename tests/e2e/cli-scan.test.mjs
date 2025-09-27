import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createWorkspace, runCli } from './helpers.js';

const JS_SAMPLE = `navigator.usb.requestDevice({ filters: [] });\n`;
const CSS_SAMPLE = `.card:has(.cta) {\n  color: red;\n}\n`;

test('scan command respects ignore patterns from configuration', async (t) => {
  const config = JSON.stringify(
    {
      mode: 'repo',
      include: ['src/**/*.js'],
      ignore: ['src/ignored/'],
    },
    null,
    2,
  );

  const { workspace, cleanup } = await createWorkspace({
    'base-lint.config.json': `${config}\n`,
    'src/include.js': JS_SAMPLE,
    'src/ignored/skip.js': JS_SAMPLE,
  });
  t.after(cleanup);

  const previousCwd = process.cwd();
  process.chdir(workspace);
  t.after(() => {
    process.chdir(previousCwd);
  });

  const { runScanCommand } = await import('../../packages/cli/src/commands/scan.ts');
  await runScanCommand({ mode: 'repo', out: '.base-lint-report' });

  const metaPath = path.join(workspace, '.base-lint-report', 'meta.json');
  const meta = JSON.parse(await readFile(metaPath, 'utf8'));

  assert.deepEqual(meta.filesAnalyzed.sort(), ['src/include.js']);
});

test('scan command generates baseline reports in repo mode', async (t) => {
  const { workspace, cleanup } = await createWorkspace({
    'src/app.js': JS_SAMPLE,
    'src/styles.css': CSS_SAMPLE,
  });
  t.after(cleanup);

  const result = await runCli(
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
      { featureId: 'webusb', baseline: 'limited' },
      { featureId: 'has', baseline: 'newly' },
    ],
  );

  const meta = JSON.parse(await readFile(path.join(reportDir, 'meta.json'), 'utf8'));
  assert.equal(meta.config.mode, 'repo');
  assert.equal(meta.config.treatNewlyAs, 'warn');
  assert.deepEqual(meta.filesAnalyzed.sort(), ['src/app.js', 'src/styles.css']);

  const markdown = await readFile(path.join(reportDir, 'report.md'), 'utf8');
  assert.ok(markdown.includes('WebUSB'));
  assert.ok(markdown.includes(':has()'));

  assert.ok(result.stdout.includes('## Base Lint Report'));
  assert.ok(result.stdout.includes('**Status:**'));
  assert.ok(result.stdout.includes('WebUSB'));
});
