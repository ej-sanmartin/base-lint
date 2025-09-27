import { readFileSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { pathToFileURL } from 'url';

export type BaselineLevel = 'limited' | 'newly' | 'widely';

interface WebFeatureEntryData {
  name?: string;
  status?: {
    baseline?: boolean | 'low' | 'high' | null;
  };
  compat_features?: string[];
}

interface WebFeaturesDataset {
  features?: Record<string, WebFeatureEntryData>;
}

interface WebFeatureEntry {
  id: string;
  name: string;
  status: {
    baseline: boolean | 'low' | 'high' | null;
  };
  compat_features?: string[];
}

/* c8 ignore start */
const moduleUrl =
  typeof import.meta !== 'undefined' && import.meta.url
    ? import.meta.url
    : typeof __filename !== 'undefined'
      ? pathToFileURL(__filename).href
      : pathToFileURL(path.join(process.cwd(), 'index.js')).href;

const require = createRequire(moduleUrl);
const dataset = require('web-features/data.json') as WebFeaturesDataset;

let datasetVersion = 'unknown';
try {
  const modulePath = require.resolve('web-features');
  const packageJsonPath = path.join(path.dirname(modulePath), 'package.json');
  const packageContents = readFileSync(packageJsonPath, 'utf-8');
  const parsed = JSON.parse(packageContents) as { version?: string };
  if (typeof parsed.version === 'string') {
    datasetVersion = parsed.version;
  }
} catch (error) {
  datasetVersion = 'unknown';
}

const featuresById = new Map<string, WebFeatureEntry>();
const rawFeatures = dataset.features ?? {};
for (const [featureId, feature] of Object.entries(rawFeatures)) {
  featuresById.set(featureId, {
    id: featureId,
    name: feature.name ?? featureId,
    status: {
      baseline: feature.status?.baseline ?? null,
    },
    compat_features: feature.compat_features ?? [],
  });
}

export function getDatasetVersion(): string {
  return datasetVersion;
}

export function getBaselineInfo(featureId: string): {
  level: BaselineLevel;
  featureName: string;
  compatKeys: string[];
} {
  /* c8 ignore next */
  const entry = featuresById.get(featureId);
  if (!entry) {
    return {
      level: 'widely',
      featureName: featureId,
      compatKeys: [],
    };
  }
  const baseline = normalizeBaseline(entry.status?.baseline);
  return {
    level: baseline,
    featureName: entry.name ?? featureId,
    compatKeys: entry.compat_features ?? [],
  };
}

export function getGuidanceFor(level: BaselineLevel): string {
  switch (level) {
    case 'limited':
      return 'Provide fallback UI or feature detection for unsupported browsers.';
    case 'newly':
      return 'OK for modern targets; keep a fallback in place for older browsers.';
    default:
      return 'No action required.';
  }
}

function normalizeBaseline(value: boolean | 'low' | 'high' | null | undefined): BaselineLevel {
  if (value === false) {
    return 'limited';
  }
  if (value === 'low') {
    return 'newly';
  }
  if (value === 'high') {
    return 'widely';
  }
  return 'widely';
}

export function computeBaselineFromCompat(_compatKeys: string[]): BaselineLevel | null {
  // Placeholder for future integration with compute-baseline and MDN BCD data.
  return null;
}
/* c8 ignore end */
