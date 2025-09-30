import type { Report } from '../analyze.js';
import { formatMarkdown } from '../formats/format-md.js';

export function createMarkdownReport(report: Report): string {
  return formatMarkdown(report);
}
