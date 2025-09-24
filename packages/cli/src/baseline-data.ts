import dataset from 'web-features/data/features.json' assert { type: 'json' };
import datasetPackage from 'web-features/package.json' assert { type: 'json' };

export type BaselineLevel = 'limited' | 'newly' | 'widely';

interface WebFeatureEntry {
  id: string;
  name: string;
  status: {
    baseline: boolean | 'low' | 'high' | null;
  };
  compat_features?: string[];
}

const features = (dataset as WebFeatureEntry[]) ?? [];
const featuresById = new Map<string, WebFeatureEntry>();
for (const feature of features) {
  featuresById.set(feature.id, feature);
}

export function getDatasetVersion(): string {
  return (datasetPackage as { version?: string }).version ?? 'unknown';
}

export function getBaselineInfo(featureId: string): {
  level: BaselineLevel;
  featureName: string;
  compatKeys: string[];
} {
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
