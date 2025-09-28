import { Command } from 'commander';
import { runScanCommand } from './commands/scan.js';
import { runEnforceCommand } from './commands/enforce.js';
import { runCommentCommand } from './commands/comment.js';
import { runAnnotateCommand } from './commands/annotate.js';
import { runCleanCommand } from './commands/clean.js';
import { DEFAULT_REPORT_DIRECTORY, DEFAULT_REPORT_PATH } from './constants.js';
import pkg from '../package.json' with { type: 'json' };

const program = new Command();

program
  .name('base-lint')
  .description('Baseline-aware linting for modern web platform features')
  .version(pkg.version ?? '0.0.0');

program
  .command('scan')
  .description('Scan files for Baseline coverage issues')
  .option('--mode <mode>', 'analysis mode: diff or repo', 'diff')
  .option('--out <dir>', 'output directory for reports', DEFAULT_REPORT_DIRECTORY)
  .option('--strict', 'enable strict feature detection')
  .option('--treat-newly <behavior>', 'treat Newly features as warn|error|ignore', 'warn')
  .option('--config <path>', 'path to config file override')
  .option('--print-full-report', 'print the full Markdown report to stdout')
  .action(async (options) => {
    try {
      await runScanCommand(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('enforce')
  .description('Enforce policy against a previously generated JSON report')
  .option('--input <file>', 'path to JSON report', DEFAULT_REPORT_PATH)
  .option('--max-limited <count>', 'maximum number of limited findings', '0')
  .option('--fail-on-warn', 'treat Newly findings as failures')
  .action(async (options, command) => {
    try {
      await runEnforceCommand({
        ...options,
        inputSource: command.getOptionValueSource('input'),
      });
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('comment')
  .description('Create or update a sticky pull request summary comment on GitHub')
  .requiredOption('--input <file>', 'Markdown report to post')
  .option('--sticky-marker <marker>', 'HTML comment marker for sticky comment', '<!-- base-lint-sticky -->')
  .action(async (options) => {
    try {
      await runCommentCommand(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('annotate')
  .description('Publish GitHub Checks annotations for findings')
  .requiredOption('--input <file>', 'JSON report to annotate from')
  .option('--batch-size <n>', 'number of annotations per API request', '50')
  .action(async (options) => {
    try {
      await runAnnotateCommand(options);
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('clean')
  .description('Remove generated Baseline report artifacts')
  .option('--out <dir>', 'report directory to delete', DEFAULT_REPORT_DIRECTORY)
  .action(async (options) => {
    try {
      await runCleanCommand(options);
    } catch (error) {
      handleError(error);
    }
  });

program.parseAsync().catch((error) => {
  handleError(error);
});

function handleError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
