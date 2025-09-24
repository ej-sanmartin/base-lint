import path from 'path';
import { readJSON } from '../fs-helpers.js';
import type { Report } from '../core/analyze.js';
import { logger } from '../logger.js';

interface EnforceOptions {
  input: string;
  maxLimited?: string;
  failOnWarn?: boolean;
}

export async function runEnforceCommand(options: EnforceOptions): Promise<void> {
  const cwd = process.cwd();
  const inputPath = path.resolve(cwd, options.input);
  const report = await readJSON<Report>(inputPath);
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
