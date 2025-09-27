import path from 'path';
import { promises as fs } from 'fs';
import { logger } from '../logger.js';
import { DEFAULT_REPORT_DIRECTORY } from '../constants.js';

interface CleanCommandOptions {
  out?: string;
}

export async function runCleanCommand(options: CleanCommandOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const targetDir = path.resolve(cwd, options.out ?? DEFAULT_REPORT_DIRECTORY);

  try {
    await fs.rm(targetDir, { recursive: true, force: true });
    logger.info(`Removed report directory at ${targetDir}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to remove report directory at ${targetDir}: ${message}`);
    throw error;
  }
}
