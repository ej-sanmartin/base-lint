import type { ReportSummary } from '../analyze.js';
import type { TreatNewlyAs } from '../../config.js';

export interface PolicyThresholds {
  maxLimited: number;
  treatNewlyAs: TreatNewlyAs;
}

export interface PolicyExit {
  code: 0 | 1 | 2 | 3;
  message?: string;
}

export function evaluatePolicyExit(summary: ReportSummary, thresholds: PolicyThresholds): PolicyExit {
  const maxLimited = Number.isFinite(thresholds.maxLimited) ? thresholds.maxLimited : 0;

  if (summary.limited > maxLimited) {
    return {
      code: 1,
      message: `Limited findings (${summary.limited}) exceed the allowed maximum (${maxLimited}).`,
    };
  }

  if (thresholds.treatNewlyAs === 'error' && summary.newly > 0) {
    return {
      code: 2,
      message: `Newly findings (${summary.newly}) are treated as errors by policy.`,
    };
  }

  return { code: 0 };
}
