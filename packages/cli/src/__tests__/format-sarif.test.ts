import test from 'node:test';
import assert from 'node:assert/strict';

import type { Report } from '../core/analyze.js';
import { formatSarif } from '../core/formats/format-sarif.js';

const baseReport: Report = {
  summary: { total: 3, limited: 1, newly: 1, widely: 1 },
  findings: [
    {
      file: 'src\\components\\app.tsx',
      line: 12,
      column: 5,
      featureId: 'api.fetch',
      featureName: 'Fetch API',
      baseline: 'limited',
      guidance: 'Avoid using Fetch API in limited baseline environments.',
      ruleId: 'baseline/limited',
    },
    {
      file: 'src/utils/network.ts',
      line: 34,
      column: null,
      featureId: 'api.Promise',
      featureName: 'Promise',
      baseline: 'newly',
      guidance: 'Promises have limited support in some environments.',
      ruleId: 'baseline/newly',
    },
    {
      file: 'styles/main.css',
      line: null,
      column: null,
      featureId: 'css.backdrop-filter',
      featureName: 'backdrop-filter',
      baseline: 'widely',
      guidance: 'Feature is broadly available.',
      ruleId: 'baseline/widely',
    },
  ],
  meta: {
    cliVersion: '1.2.3',
    datasetVersion: '2023.09',
    strict: false,
    treatNewlyAs: 'warn',
    generatedAt: '2024-01-01T00:00:00.000Z',
  },
};

function parseSarif(report: Report) {
  const sarifText = formatSarif(report);
  return JSON.parse(sarifText) as any;
}

test('formatSarif emits SARIF 2.1.0 with expected tool metadata', () => {
  const sarif = parseSarif(baseReport);
  assert.equal(sarif.version, '2.1.0');
  assert.equal(sarif.$schema, 'https://json.schemastore.org/sarif-2.1.0.json');
  assert.ok(Array.isArray(sarif.runs));
  assert.equal(sarif.runs.length, 1);

  const [run] = sarif.runs;
  assert.ok(run);
  assert.ok(run.tool);
  assert.ok(run.tool.driver);
  assert.equal(run.tool.driver.name, 'base-lint');
  assert.equal(run.tool.driver.semanticVersion, baseReport.meta.cliVersion);
  assert.ok(Array.isArray(run.tool.driver.rules));
  assert.equal(run.tool.driver.rules.length, 3);

  const ruleIds = run.tool.driver.rules.map((rule: any) => rule.id);
  assert.deepEqual(ruleIds, [
    'web-feature:api.fetch',
    'web-feature:api.Promise',
    'web-feature:css.backdrop-filter',
  ]);

  for (const rule of run.tool.driver.rules) {
    assert.ok(rule.shortDescription?.text);
    assert.ok(rule.fullDescription?.text);
    assert.match(rule.properties.category, /Limited|Newly|Widely/);
    assert.ok(rule.defaultConfiguration?.level);
  }
});

test('formatSarif maps findings to results with normalized locations', () => {
  const sarif = parseSarif(baseReport);
  const [run] = sarif.runs;
  assert.ok(Array.isArray(run.results));
  assert.equal(run.results.length, baseReport.findings.length);

  const [limitedResult, newlyResult, widelyResult] = run.results;

  assert.equal(limitedResult.ruleId, 'web-feature:api.fetch');
  assert.equal(limitedResult.level, 'error');
  assert.match(limitedResult.message.text, /Fetch API is Limited/);
  const limitedLocation = limitedResult.locations[0].physicalLocation;
  assert.equal(limitedLocation.artifactLocation.uri, 'src/components/app.tsx');
  assert.equal(limitedLocation.region.startLine, 12);
  assert.equal(limitedLocation.region.startColumn, 5);
  assert.equal(limitedLocation.region.endLine, 12);
  assert.equal(limitedLocation.region.endColumn, 5);

  assert.equal(newlyResult.ruleId, 'web-feature:api.Promise');
  assert.equal(newlyResult.level, 'warning');
  const newlyRegion = newlyResult.locations[0].physicalLocation.region;
  assert.equal(newlyRegion.startLine, 34);
  assert.equal(newlyRegion.endLine, 34);
  assert.ok(!('startColumn' in newlyRegion));
  assert.ok(!('endColumn' in newlyRegion));

  assert.equal(widelyResult.ruleId, 'web-feature:css.backdrop-filter');
  assert.equal(widelyResult.level, 'note');
  const widelyLocation = widelyResult.locations[0].physicalLocation;
  assert.equal(widelyLocation.artifactLocation.uri, 'styles/main.css');
  assert.ok(!('region' in widelyLocation) || widelyLocation.region === undefined);
});

test('formatSarif deduplicates rules for repeated findings', () => {
  const duplicated: Report = {
    ...baseReport,
    findings: [
      ...baseReport.findings,
      {
        file: 'src/components/app.tsx',
        line: 20,
        column: 2,
        featureId: 'api.fetch',
        featureName: 'Fetch API',
        baseline: 'limited',
        guidance: 'Avoid using Fetch API in limited baseline environments.',
        ruleId: 'baseline/limited',
      },
    ],
    summary: { total: 4, limited: 2, newly: 1, widely: 1 },
  };

  const sarif = parseSarif(duplicated);
  const [run] = sarif.runs;
  assert.equal(run.tool.driver.rules.length, 3);
  assert.equal(run.results.length, duplicated.findings.length);
});
