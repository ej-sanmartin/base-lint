import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { analyze } from '../core/analyze.js';
import { getBaselineInfo } from '../baseline-data.js';
import { parseJavaScript } from '../utils/ast-js.js';
import { parseCSS } from '../utils/ast-css.js';
import { detectJsFeatures, detectCssFeatures } from '../utils/feature-map.js';

const repoRoot = path.resolve(process.cwd());

test('demo app findings include Baseline Limited and Newly entries', async () => {
  const report = await analyze({
    cwd: repoRoot,
    files: ['examples/demo-app/src/app.tsx', 'examples/demo-app/src/styles.css'],
    strict: false,
    suppress: [],
    treatNewlyAs: 'warn',
    cliVersion: '0.0.0-test',
  });

  assert.equal(report.summary.total, 3);
  assert.equal(report.summary.limited, 2);
  assert.equal(report.summary.newly, 1);
  assert.equal(report.summary.widely, 0);

  assert.equal(report.findings.length, 3);
  const shareFindings = report.findings.filter((finding) => finding.featureId === 'share');
  const hasFindings = report.findings.filter((finding) => finding.featureId === 'has');

  assert.equal(shareFindings.length, 2);
  for (const finding of shareFindings) {
    assert.equal(finding.featureName, 'navigator.share()');
    assert.equal(finding.baseline, 'limited');
  }

  assert.equal(hasFindings.length, 1);
  assert.equal(hasFindings[0]?.baseline, 'newly');
});

test('detectJsFeatures maps modern Web APIs to Baseline feature IDs', () => {
  const code = `
    navigator.usb.requestDevice({ filters: [] });
    Notification.requestPermission();
    new Notification('ding');
    new BroadcastChannel('updates');
    IdleDetector;
    new IdleDetector();
  `;
  const optionalChainSamples = `
    navigator?.share?.({ url: 'https://example.com' });
    navigator!.share({ url: 'https://example.com' });
  `;

  const program = parseJavaScript(`${code}\n${optionalChainSamples}`, 'sample.tsx');
  assert.ok(program, 'expected JavaScript program to parse');

  const detections = detectJsFeatures(program, { strict: false });
  const ids = detections.map((detection) => detection.featureId).sort();

  assert.deepEqual(ids, [
    'broadcast-channel',
    'idle-detection',
    'idle-detection',
    'notifications',
    'notifications',
    'share',
    'share',
    'webusb',
  ]);
});

test('detectCssFeatures detects :has(), :where(), and @container usage', () => {
  const css = `
    .card:has(.cta) { color: red; }
    .wrapper :where(.cta) { color: blue; }
    @container (min-width: 20rem) { .cta { font-weight: bold; } }
  `;

  const root = parseCSS(css, 'styles.css');
  assert.ok(root, 'expected CSS to parse');

  const detections = detectCssFeatures(root);
  const ids = detections.map((detection) => detection.featureId).sort();

  assert.deepEqual(ids, ['container-queries', 'has', 'where']);
});

test('detectJsFeatures only reports computed members in strict mode', () => {
  const code = `
    const share = 'share';
    navigator[share]?.({ title: 'Strict Share' });
  `;
  const program = parseJavaScript(code, 'computed.tsx');
  assert.ok(program, 'expected computed member expression to parse');

  const nonStrictDetections = detectJsFeatures(program, { strict: false });
  assert.equal(nonStrictDetections.length, 0);

  const strictDetections = detectJsFeatures(program, { strict: true });
  assert.ok(strictDetections.some((detection) => detection.featureId === 'share'));
});

test('detectJsFeatures ignores literal computed members even in strict mode', () => {
  const code = `navigator['share']({ title: 'Ignored' });`;
  const program = parseJavaScript(code, 'literal.tsx');
  assert.ok(program, 'expected literal member expression to parse');

  const detections = detectJsFeatures(program, { strict: true });
  assert.equal(detections.length, 0);
});

test('analyze processes inline HTML assets for Baseline coverage', async (t) => {
  const workspace = await mkdtemp(path.join(tmpdir(), 'base-lint-inline-'));
  t.after(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  const html = `
    <!doctype html>
    <html>
      <head>
        <style>
          .card:has(.cta) { color: red; }
        </style>
      </head>
      <body>
        <script>
          navigator.usb.requestDevice({ filters: [] });
        </script>
      </body>
    </html>
  `;

  await writeFile(path.join(workspace, 'page.html'), html, 'utf8');

  const report = await analyze({
    cwd: workspace,
    files: ['page.html'],
    strict: false,
    suppress: [],
    treatNewlyAs: 'warn',
    cliVersion: '0.0.0-test',
  });

  assert.equal(report.summary.total, 2);
  assert.equal(report.summary.limited, 1);
  assert.equal(report.summary.newly, 1);

  const ids = report.findings.map((finding) => finding.featureId).sort();
  assert.deepEqual(ids, ['has', 'webusb']);
});

test('getBaselineInfo normalizes dataset statuses', () => {
  assert.equal(getBaselineInfo('share').level, 'limited');
  assert.equal(getBaselineInfo('has').level, 'newly');
  assert.equal(getBaselineInfo('where').level, 'widely');

  const fallback = getBaselineInfo('non-existent-feature');
  assert.equal(fallback.level, 'widely');
  assert.equal(fallback.featureName, 'non-existent-feature');
});

test('analyze skips missing files and suppressed detections', async (t) => {
  const workspace = await mkdtemp(path.join(tmpdir(), 'base-lint-missing-'));
  t.after(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  const js = `navigator.usb.requestDevice({ filters: [] });`;
  await writeFile(path.join(workspace, 'app.js'), js, 'utf8');

  const report = await analyze({
    cwd: workspace,
    files: ['missing.js', 'app.js'],
    strict: false,
    suppress: ['webusb'],
    treatNewlyAs: 'warn',
    cliVersion: '0.0.0-test',
  });

  assert.equal(report.summary.total, 0);
  assert.equal(report.findings.length, 0);
});
