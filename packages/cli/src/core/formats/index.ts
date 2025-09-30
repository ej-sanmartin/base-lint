import type { Report } from '../analyze.js';
import { formatJson } from './format-json.js';
import { formatMarkdown } from './format-md.js';
import { formatSarif } from './format-sarif.js';

export type ReportFormat = 'md' | 'json' | 'sarif';

const FORMATTERS: Record<ReportFormat, (report: Report) => string> = {
  md: formatMarkdown,
  json: formatJson,
  sarif: formatSarif,
};

interface FormatReportOptions {
  format: ReportFormat;
}

export function formatReport(report: Report, options: FormatReportOptions): string {
  const formatter = FORMATTERS[options.format];
  if (!formatter) {
    throw new Error(`Unsupported report format: ${options.format}`);
  }
  return formatter(report);
}

export { formatJson } from './format-json.js';
export { formatMarkdown } from './format-md.js';
export { formatSarif } from './format-sarif.js';
