import path from 'path';
import { promises as fs } from 'fs';
import { readOptionalFile } from './fs-helpers.js';

export type ScanMode = 'diff' | 'repo';
export type TreatNewlyAs = 'warn' | 'error' | 'ignore';

export interface BaseLintConfig {
  mode: ScanMode;
  treatNewlyAs: TreatNewlyAs;
  maxLimited: number;
  strict: boolean;
  targets: 'all' | string;
  suppress: string[];
  include: string[];
  ignore: string[];
}

export interface ResolvedConfig {
  config: BaseLintConfig;
  ignorePatterns: string[];
  includePatterns: string[];
  configPath?: string;
}

const DEFAULT_CONFIG: BaseLintConfig = {
  mode: 'diff',
  treatNewlyAs: 'warn',
  maxLimited: 0,
  strict: false,
  targets: 'all',
  suppress: [],
  include: [],
  ignore: [],
};

const DEFAULT_IGNORE = ['node_modules/', 'dist/', 'build/', 'coverage/', '*.min.js'];

export async function resolveConfig(
  cwd: string,
  cliOptions: { mode?: string; strict?: boolean; treatNewly?: string; config?: string }
): Promise<ResolvedConfig> {
  const configPath = cliOptions.config
    ? path.resolve(cwd, cliOptions.config)
    : path.join(cwd, 'base-lint.config.json');

  const fileConfig = await loadConfigFile(configPath);
  if (cliOptions.config && !fileConfig) {
    throw new Error(`Config file not found at ${configPath}`);
  }
  const merged: BaseLintConfig = {
    ...DEFAULT_CONFIG,
    ...(fileConfig ?? {}),
  };

  if (cliOptions.mode) {
    if (!['diff', 'repo'].includes(cliOptions.mode)) {
      throw new Error(`Unsupported mode: ${cliOptions.mode}`);
    }
    merged.mode = cliOptions.mode as ScanMode;
  }

  if (typeof cliOptions.strict === 'boolean') {
    merged.strict = cliOptions.strict;
  }

  if (cliOptions.treatNewly) {
    if (!['warn', 'error', 'ignore'].includes(cliOptions.treatNewly)) {
      throw new Error(`Unsupported treat-newly option: ${cliOptions.treatNewly}`);
    }
    merged.treatNewlyAs = cliOptions.treatNewly as TreatNewlyAs;
  }

  merged.maxLimited = Number(fileConfig?.maxLimited ?? merged.maxLimited);
  if (Number.isNaN(merged.maxLimited)) {
    merged.maxLimited = 0;
  }

  const suppress = Array.isArray(merged.suppress) ? merged.suppress : [];
  const ignoreList = Array.isArray(fileConfig?.ignore) ? fileConfig.ignore ?? [] : [];
  const includeList = Array.isArray(fileConfig?.include) ? fileConfig.include ?? [] : [];

  const ignoreFilePatterns = await loadIgnoreFile(cwd);
  const combinedIgnore = [...DEFAULT_IGNORE, ...ignoreList, ...ignoreFilePatterns];
  const uniqueIgnore = Array.from(new Set(combinedIgnore.filter(Boolean)));

  const includePatterns = includeList;

  return {
    config: {
      ...merged,
      suppress,
      ignore: uniqueIgnore,
      include: includePatterns,
    },
    ignorePatterns: uniqueIgnore,
    includePatterns,
    configPath: fileConfig ? configPath : undefined,
  };
}

async function loadConfigFile(configPath: string): Promise<Partial<BaseLintConfig> | null> {
  try {
    const contents = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(contents) as Partial<BaseLintConfig>;
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function loadIgnoreFile(cwd: string): Promise<string[]> {
  const file = await readOptionalFile(path.join(cwd, '.base-lintignore'));
  if (!file) {
    return [];
  }
  return file
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}
