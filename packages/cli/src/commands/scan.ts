import path from 'path';
import { globby } from 'globby';
import { minimatch } from 'minimatch';
import ignore from 'ignore';
import type { OptionValueSource } from 'commander';
import { analyze } from '../core/analyze.js';
import { formatReport } from '../core/formats/index.js';
import { ensureDir, writeFile, writeJSON } from '../fs-helpers.js';
import { resolveConfig } from '../config.js';
import { getDiffFiles } from '../git-diff.js';
import { logger } from '../logger.js';
import { formatMarkdownSummary } from '../core/reporters/summary.js';
import pkg from '../../package.json' assert { type: 'json' };
import { DEFAULT_REPORT_DIRECTORY } from '../constants.js';
import type { ReportFormat } from '../core/formats/index.js';
import { evaluatePolicyExit } from '../core/policy/exit-codes.js';

interface ScanCommandOptions {
  mode?: string;
  out?: string;
  outFormat?: string;
  outFile?: string;
  outFormatSource?: OptionValueSource;
  strict?: boolean;
  treatNewly?: string;
  config?: string;
  printFullReport?: boolean;
}

const SUPPORTED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.css', '.scss', '.html', '.htm'];

export async function runScanCommand(options: ScanCommandOptions): Promise<void> {
  const cwd = process.cwd();
  const outputDir = path.resolve(cwd, options.out ?? DEFAULT_REPORT_DIRECTORY);
  const resolved = await resolveConfig(cwd, options);
  const config = resolved.config;

  const files = await collectFiles(cwd, config.mode, resolved.includePatterns, resolved.ignorePatterns);
  if (files.length === 0) {
    logger.warn('No files matched the scan configuration.');
  } else {
    logger.info(`Scanning ${files.length} file(s) in ${config.mode} mode.`);
  }

  const report = await analyze({
    cwd,
    files,
    strict: config.strict,
    suppress: config.suppress ?? [],
    treatNewlyAs: config.treatNewlyAs,
    cliVersion: (pkg as { version?: string }).version ?? '0.0.0',
  });

  await ensureDir(outputDir);
  const markdownReport = formatReport(report, { format: 'md' });
  const jsonReport = formatReport(report, { format: 'json' });
  await writeFile(path.join(outputDir, 'report.json'), jsonReport);
  await writeFile(path.join(outputDir, 'report.md'), markdownReport);
  await writeJSON(path.join(outputDir, 'meta.json'), {
    cliVersion: report.meta.cliVersion,
    datasetVersion: report.meta.datasetVersion,
    generatedAt: report.meta.generatedAt,
    config: {
      path: resolved.configPath ?? null,
      mode: config.mode,
      strict: config.strict,
      treatNewlyAs: config.treatNewlyAs,
      maxLimited: config.maxLimited,
      suppress: config.suppress,
      include: config.include,
      ignore: config.ignore,
    },
    filesAnalyzed: files,
  });

  const requestedFormatInput = (options.outFormat ?? 'md').toLowerCase();
  const supportedFormats: ReportFormat[] = ['md', 'json', 'sarif'];
  if (!supportedFormats.includes(requestedFormatInput as ReportFormat)) {
    throw new Error(
      `Invalid value for --out-format: ${options.outFormat}. Supported formats are ${supportedFormats.join(', ')}.`
    );
  }

  const requestedFormat = requestedFormatInput as ReportFormat;
  const formattedReport = formatReport(report, { format: requestedFormat });
  const outFilePath = options.outFile ? path.resolve(cwd, options.outFile) : undefined;
  const shouldPrintSummary =
    requestedFormat === 'md' &&
    (options.outFormatSource === undefined || options.outFormatSource === 'default');

  if (shouldPrintSummary) {
    const summary = options.printFullReport ? markdownReport : formatMarkdownSummary(markdownReport);
    if (summary.trim().length > 0) {
      console.log(summary);
    }
  }

  if (outFilePath) {
    await ensureDir(path.dirname(outFilePath));
    await writeFile(outFilePath, formattedReport);
  } else {
    process.stdout.write(formattedReport);
    if (!formattedReport.endsWith('\n')) {
      process.stdout.write('\n');
    }
  }

  logger.info(`Report written to ${outputDir}`);

  const policy = evaluatePolicyExit(report.summary, {
    maxLimited: config.maxLimited,
    treatNewlyAs: config.treatNewlyAs,
  });

  if (policy.code !== 0) {
    process.exitCode = policy.code;
    if (policy.message) {
      logger.error(policy.message);
    }
  }
}

async function collectFiles(
  cwd: string,
  mode: 'diff' | 'repo',
  include: string[],
  ignorePatterns: string[]
): Promise<string[]> {
  const normalizedIgnore = expandPatterns(ignorePatterns);
  const ig = ignore();
  ig.add(normalizedIgnore);
  const includeMatchers = include.map((pattern) => minimatch.filter(pattern, { dot: true, matchBase: true }));

  const shouldInclude = (file: string): boolean => {
    if (!SUPPORTED_EXTENSIONS.includes(path.extname(file).toLowerCase())) {
      return false;
    }
    if (ig.ignores(file)) {
      return false;
    }
    if (includeMatchers.length > 0 && !includeMatchers.some((fn) => fn(file))) {
      return false;
    }
    return true;
  };

  if (mode === 'repo') {
    const patterns = include.length > 0 ? include : ['**/*'];
    const files = await globby(patterns, {
      cwd,
      gitignore: true,
      dot: true,
      ignore: normalizedIgnore,
      onlyFiles: true,
    });
    return Array.from(new Set(files.filter((file) => shouldInclude(file))));
  }

  const diffFiles = await getDiffFiles(cwd);
  return Array.from(new Set(diffFiles.filter((file) => shouldInclude(file))));
}

function expandPatterns(patterns: string[]): string[] {
  const expanded: string[] = [];
  for (const pattern of patterns) {
    expanded.push(pattern);
    if (pattern.endsWith('/')) {
      expanded.push(`${pattern}**`);
    }
  }
  return expanded;
}

