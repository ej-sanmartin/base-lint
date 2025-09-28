import path from 'path';
import type { OptionValueSource } from 'commander';
import { readJSON } from '../fs-helpers.js';
import type { Report } from '../core/analyze.js';
import { logger } from '../logger.js';
import { DEFAULT_REPORT_PATH } from '../constants.js';

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
      process.exitCode = 1;
      return;
    }
    throw error;
  }
  const maxLimited = Number(options.maxLimited ?? 0);
  const limited = report.summary.limited;
  const newly = report.summary.newly;
  const failOnWarn = options.failOnWarn ?? report.meta.treatNewlyAs === 'error';

  logger.info(`Report summary – Limited: ${limited}, Newly: ${newly}, Widely: ${report.summary.widely}`);

  if (Number.isNaN(maxLimited)) {
    throw new Error('Invalid max-limited value.');
  }

  if (limited > maxLimited) {
    logger.error(`Limited findings (${limited}) exceed the allowed maximum (${maxLimited}).`);
    process.exitCode = 1;
    return;
  }

  if (failOnWarn && newly > 0) {
    logger.error(`Newly findings (${newly}) present and fail-on-warn is enabled.`);
    process.exitCode = 1;
    return;
  }

  logger.info('Baseline policy satisfied.');
}
