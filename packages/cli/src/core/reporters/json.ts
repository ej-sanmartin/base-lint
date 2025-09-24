import type { Report } from '../analyze.js';

export function createJsonReport(report: Report): string {
  return JSON.stringify(report, null, 2);
}
