import type { Report } from '../analyze.js';

export function formatJson(report: Report): string {
  return JSON.stringify(report, null, 2);
}
