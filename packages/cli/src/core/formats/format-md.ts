import type { Report } from '../analyze.js';

export function formatMarkdown(report: Report): string {
  const lines: string[] = [];
  lines.push('<!-- base-lint-sticky -->');
  lines.push('## Base Lint Report');
  lines.push('');
  const status = `**Status:** ${formatStatus(report.summary)}`;
  lines.push(status);
  lines.push('');
  lines.push('| File | Line | Feature | Baseline | Guidance |');
  lines.push('|------|------|---------|----------|----------|');
  if (report.findings.length === 0) {
    lines.push('| (none) | - | - | - | Baseline clear |');
  } else {
    for (const finding of report.findings) {
      const line = finding.line != null ? String(finding.line) : '-';
      const feature = escapePipes(finding.featureName);
      const guidance = escapePipes(finding.guidance);
      lines.push(`| ${finding.file} | ${line} | ${feature} | ${capitalize(finding.baseline)} | ${guidance} |`);
    }
  }
  lines.push('');
  lines.push(`Policy: Limited = error (max 0), Newly = ${formatNewlyPolicy(report.meta.treatNewlyAs)}`);
  lines.push(`Dataset: web-features ${report.meta.datasetVersion}`);
  return lines.join('\n');
}

function formatStatus(summary: Report['summary']): string {
  const parts = [
    `❌ Limited: ${summary.limited}`,
    `⚠️ Newly: ${summary.newly}`,
    `✅ Widely: ${summary.widely}`,
  ];
  return parts.join(' · ');
}

function formatNewlyPolicy(treat: Report['meta']['treatNewlyAs']): string {
  switch (treat) {
    case 'error':
      return 'error';
    case 'ignore':
      return 'ignored';
    default:
      return 'warn (non-blocking)';
  }
}

function escapePipes(value: string): string {
  return value.replace(/\|/g, '\\|');
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
