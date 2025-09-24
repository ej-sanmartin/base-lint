import { promises as fs } from 'fs';
import path from 'path';
import { parseJavaScript } from '../utils/ast-js.js';
import { parseCSS } from '../utils/ast-css.js';
import { extractInlineAssets } from '../utils/ast-html.js';
import { detectJsFeatures, detectCssFeatures, Detection } from '../utils/feature-map.js';
import { BaselineLevel, getBaselineInfo, getDatasetVersion, getGuidanceFor } from '../baseline-data.js';
import { logger } from '../logger.js';

export interface Finding {
  file: string;
  line: number | null;
  column: number | null;
  featureId: string;
  featureName: string;
  baseline: BaselineLevel;
  guidance: string;
  ruleId: string;
}

export interface ReportSummary {
  total: number;
  limited: number;
  newly: number;
  widely: number;
}

export interface ReportMeta {
  cliVersion: string;
  datasetVersion: string;
  strict: boolean;
  treatNewlyAs: 'warn' | 'error' | 'ignore';
  generatedAt: string;
}

export interface Report {
  summary: ReportSummary;
  findings: Finding[];
  meta: ReportMeta;
}

export interface AnalyzeOptions {
  cwd: string;
  files: string[];
  strict: boolean;
  suppress: string[];
  treatNewlyAs: 'warn' | 'error' | 'ignore';
  cliVersion: string;
}

export async function analyze(options: AnalyzeOptions): Promise<Report> {
  const { cwd, files, strict, suppress, treatNewlyAs, cliVersion } = options;
  const datasetVersion = getDatasetVersion();
  const findings: Finding[] = [];

  for (const filePath of files) {
    const absolute = path.resolve(cwd, filePath);
    let content: string;
    try {
      content = await fs.readFile(absolute, 'utf8');
    } catch (error) {
      logger.warn(`Unable to read ${filePath}: ${(error as Error).message}`);
      continue;
    }

    const extension = path.extname(filePath).toLowerCase();
    if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(extension)) {
      const detections = analyzeJavaScript(content, filePath, { strict });
      pushFindings(findings, detections, suppress);
      continue;
    }
    if (extension === '.css' || extension === '.scss') {
      const detections = analyzeCss(content, filePath);
      pushFindings(findings, detections, suppress);
      continue;
    }
    if (extension === '.html' || extension === '.htm') {
      const detections = await analyzeHtml(content, filePath, strict, suppress);
      findings.push(...detections);
      continue;
    }
  }

  findings.sort((a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0));

  const summary = summarize(findings);
  const report: Report = {
    summary,
    findings,
    meta: {
      cliVersion,
      datasetVersion,
      strict,
      treatNewlyAs,
      generatedAt: new Date().toISOString(),
    },
  };
  return report;
}

function analyzeJavaScript(code: string, filePath: string, options: { strict: boolean }): Finding[] {
  const program = parseJavaScript(code, filePath);
  if (!program) {
    logger.warn(`Unable to parse JavaScript in ${filePath}`);
    return [];
  }
  const detections = detectJsFeatures(program, { strict: options.strict });
  return detections.map((detection) => createFinding(filePath, detection));
}

function analyzeCss(code: string, filePath: string): Finding[] {
  const root = parseCSS(code, filePath);
  if (!root) {
    logger.warn(`Unable to parse CSS in ${filePath}`);
    return [];
  }
  const detections = detectCssFeatures(root);
  return detections.map((detection) => createFinding(filePath, detection));
}

async function analyzeHtml(
  code: string,
  filePath: string,
  strict: boolean,
  suppress: string[]
): Promise<Finding[]> {
  const assets = extractInlineAssets(code);
  const findings: Finding[] = [];
  for (const asset of assets) {
    if (asset.type === 'script') {
      const program = parseJavaScript(asset.content, `${filePath}#inline-script`);
      if (!program) {
        logger.warn(`Unable to parse inline script in ${filePath}`);
        continue;
      }
      const detections = detectJsFeatures(program, { strict });
      for (const detection of detections) {
        const adjusted = adjustDetectionForInline(detection, asset.line);
        const finding = createFinding(filePath, adjusted);
        if (!suppress.includes(finding.featureId)) {
          findings.push(finding);
        }
      }
    } else if (asset.type === 'style') {
      const root = parseCSS(asset.content, `${filePath}#inline-style`);
      if (!root) {
        logger.warn(`Unable to parse inline style in ${filePath}`);
        continue;
      }
      const detections = detectCssFeatures(root);
      for (const detection of detections) {
        const adjusted = adjustDetectionForInline(detection, asset.line);
        const finding = createFinding(filePath, adjusted);
        if (!suppress.includes(finding.featureId)) {
          findings.push(finding);
        }
      }
    }
  }
  return findings;
}

function adjustDetectionForInline(detection: Detection, startLine: number): Detection {
  return {
    ...detection,
    line: detection.line != null ? detection.line + startLine - 1 : startLine,
  };
}

function pushFindings(target: Finding[], detections: Finding[], suppress: string[]) {
  for (const finding of detections) {
    if (suppress.includes(finding.featureId)) {
      continue;
    }
    target.push(finding);
  }
}

function createFinding(filePath: string, detection: Detection): Finding {
  const baselineInfo = getBaselineInfo(detection.featureId);
  const guidance = getGuidanceFor(baselineInfo.level);
  return {
    file: filePath,
    line: detection.line ?? null,
    column: detection.column ?? null,
    featureId: detection.featureId,
    featureName: baselineInfo.featureName || detection.featureName,
    baseline: baselineInfo.level,
    guidance,
    ruleId: `baseline/${baselineInfo.level}`,
  };
}

function summarize(findings: Finding[]): ReportSummary {
  const summary: ReportSummary = {
    total: findings.length,
    limited: 0,
    newly: 0,
    widely: 0,
  };
  for (const finding of findings) {
    if (finding.baseline === 'limited') {
      summary.limited += 1;
    } else if (finding.baseline === 'newly') {
      summary.newly += 1;
    } else {
      summary.widely += 1;
    }
  }
  return summary;
}
