import path from 'path';
import type { OptionValueSource } from 'commander';
import { readJSON } from '../fs-helpers.js';
import type { Report } from '../core/analyze.js';
import { logger } from '../logger.js';
import { DEFAULT_REPORT_PATH } from '../constants.js';
import { evaluatePolicyExit } from '../core/policy/exit-codes.js';
import type { TreatNewlyAs } from '../config.js';

interface EnforceOptions {
  input?: string;
  maxLimited?: string;
  failOnWarn?: boolean;
  inputSource?: OptionValueSource;
}

export async function runEnforceCommand(options: EnforceOptions): Promise<void> {
  const cwd = process.cwd();
  const input = options.input ?? DEFAULT_REPORT_PATH;
  const inputPath = path.resolve(cwd, input);
  let report: Report;
  try {
    report = await readJSON<Report>(inputPath);
  } catch (error) {
    if (
      options.inputSource === 'default' &&
      (error as NodeJS.ErrnoException)?.code === 'ENOENT'
    ) {
      logger.error(
        `No report found at ${DEFAULT_REPORT_PATH} — run \`base-lint scan\` first or pass --input`,
      );
      process.exitCode = 3;
      return;
    }
    throw error;
  }
  const maxLimited = Number(options.maxLimited ?? 0);
  const limited = report.summary.limited;
  const newly = report.summary.newly;

  logger.info(`Report summary – Limited: ${limited}, Newly: ${newly}, Widely: ${report.summary.widely}`);

  if (Number.isNaN(maxLimited)) {
    throw new Error('Invalid max-limited value.');
  }

  let treatNewlyAs: TreatNewlyAs = report.meta.treatNewlyAs;
  if (options.failOnWarn === true) {
    treatNewlyAs = 'error';
  } else if (options.failOnWarn === false) {
    treatNewlyAs = report.meta.treatNewlyAs === 'ignore' ? 'ignore' : 'warn';
  }

  const policy = evaluatePolicyExit(report.summary, {
    maxLimited,
    treatNewlyAs,
  });

  if (policy.code !== 0) {
    process.exitCode = policy.code;
    if (policy.message) {
      logger.error(policy.message);
    }
    return;
  }

  logger.info('Baseline policy satisfied.');
}
