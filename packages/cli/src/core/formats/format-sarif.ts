import type { Finding, Report } from '../analyze.js';

const SARIF_VERSION = '2.1.0';
const SARIF_SCHEMA = 'https://json.schemastore.org/sarif-2.1.0.json';

const BASELINE_TO_LEVEL: Record<Finding['baseline'], 'error' | 'warning' | 'note'> = {
  limited: 'error',
  newly: 'warning',
  widely: 'note',
};

export function formatSarif(report: Report): string {
  const rules = collectRules(report);
  const results = report.findings.map((finding) => createResult(finding));

  const sarifLog = {
    $schema: SARIF_SCHEMA,
    version: SARIF_VERSION,
    runs: [
      {
        tool: {
          driver: {
            name: 'base-lint',
            semanticVersion: report.meta.cliVersion,
            informationUri: 'https://github.com/GoogleChromeLabs/base-lint',
            rules,
          },
        },
        results,
      },
    ],
  };

  return JSON.stringify(sarifLog, null, 2);
}

function collectRules(report: Report) {
  const ruleMap = new Map<string, ReturnType<typeof createRule>>();
  for (const finding of report.findings) {
    const ruleId = createRuleId(finding);
    if (!ruleMap.has(ruleId)) {
      ruleMap.set(ruleId, createRule(finding, report));
    }
  }
  return Array.from(ruleMap.values());
}

function createRule(finding: Finding, report: Report) {
  const level = BASELINE_TO_LEVEL[finding.baseline];
  return {
    id: createRuleId(finding),
    name: finding.featureName,
    shortDescription: { text: finding.featureName },
    fullDescription: { text: finding.guidance },
    defaultConfiguration: { level },
    properties: {
      category: capitalize(finding.baseline),
      baseline: finding.baseline,
      featureId: finding.featureId,
      datasetVersion: report.meta.datasetVersion,
      ruleId: finding.ruleId,
    },
  };
}

function createResult(finding: Finding) {
  const level = BASELINE_TO_LEVEL[finding.baseline];
  const locations = [createLocation(finding)];
  return {
    ruleId: createRuleId(finding),
    level,
    message: { text: createMessage(finding) },
    locations,
    properties: {
      baseline: finding.baseline,
      featureId: finding.featureId,
    },
  };
}

function createLocation(finding: Finding) {
  const region = createRegion(finding);
  const physicalLocation: Record<string, unknown> = {
    artifactLocation: { uri: toPosixUri(finding.file) },
  };

  if (region) {
    physicalLocation.region = region;
  }

  return {
    physicalLocation,
  };
}

function createRegion(finding: Finding) {
  const region: Record<string, number> = {};
  if (finding.line != null) {
    region.startLine = finding.line;
    region.endLine = finding.line;
  }
  if (finding.column != null) {
    region.startColumn = finding.column;
    region.endColumn = finding.column;
  }
  return Object.keys(region).length > 0 ? region : undefined;
}

function createMessage(finding: Finding): string {
  return `${finding.featureName} is ${capitalize(finding.baseline)}: ${finding.guidance}`;
}

function toPosixUri(file: string): string {
  return file.replace(/\\/g, '/');
}

function createRuleId(finding: Finding): string {
  return `web-feature:${finding.featureId}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
