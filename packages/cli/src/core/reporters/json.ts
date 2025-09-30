import type { Report } from '../analyze.js';
import { formatJson } from '../formats/format-json.js';

export function createJsonReport(report: Report): string {
  return formatJson(report);
}
