import path from 'path';
import { DEFAULT_IGNORE } from '../config.js';
import { logger } from '../logger.js';
import { writeFileIfAbsent } from '../fs-helpers.js';
import actionPkg from '../../../action/package.json' with { type: 'json' };

interface InitCommandOptions {
  force?: boolean;
}

const DEFAULT_CONFIG_CONTENT = `${JSON.stringify(
  {
    mode: 'diff',
    treatNewlyAs: 'warn',
    maxLimited: 0,
    strict: false,
    targets: 'all',
    suppress: [],
    include: [],
    ignore: [],
  },
  null,
  2
)}\n`;

const DEFAULT_IGNORE_CONTENT = `${DEFAULT_IGNORE.join('\n')}\n`;

function createWorkflowContent(actionVersion: string): string {
  return `name: Base Lint\n\non:\n  pull_request:\n\npermissions:\n  contents: read\n  pull-requests: write\n  checks: write\n\njobs:\n  baseline:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          fetch-depth: 0\n      - uses: ej-sanmartin/base-lint@base-lint-action-v${actionVersion}\n        with:\n          github-token: \${{ github.token }}\n          mode: diff\n          max-limited: 0\n          treat-newly-as: warn\n          comment: true\n          checks: true\n`;
}

export async function runInitCommand(options: InitCommandOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const force = Boolean(options.force);
  const actionVersion = actionPkg.version ?? '1.1.0';

  const targets = [
    {
      path: path.join(cwd, 'base-lint.config.json'),
      contents: DEFAULT_CONFIG_CONTENT,
    },
    {
      path: path.join(cwd, '.base-lintignore'),
      contents: DEFAULT_IGNORE_CONTENT,
    },
    {
      path: path.join(cwd, '.github', 'workflows', 'base-lint.yml'),
      contents: createWorkflowContent(actionVersion),
    },
  ];

  const results: { filePath: string; status: 'created' | 'overwritten' | 'skipped' }[] = [];

  for (const target of targets) {
    const status = await writeFileIfAbsent(target.path, target.contents, { force });
    results.push({ filePath: target.path, status });
    const relative = path.relative(cwd, target.path);
    if (status === 'created') {
      logger.info(`Created ${relative}`);
    } else if (status === 'overwritten') {
      logger.info(`Overwrote ${relative}`);
    } else {
      logger.warn(`Skipped ${relative} (already exists). Use --force to overwrite.`);
    }
  }

  const generated = results.filter((result) => result.status !== 'skipped');

  if (generated.length > 0) {
    logger.info('Base Lint initialization complete!');
    logger.info('Next steps:');
    logger.info('  1. Review base-lint.config.json to customize thresholds.');
    logger.info('  2. Commit the generated files to version control.');
    logger.info('  3. Push to GitHub to enable the Base Lint workflow.');
  } else {
    logger.warn('No files were created. Re-run with --force to overwrite existing files.');
  }
}
