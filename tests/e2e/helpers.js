import { mkdtemp, rm, writeFile as writeFileFs, mkdir, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SUPPORTED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.css', '.scss', '.html', '.htm']);

export async function createWorkspace(structure) {
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'base-lint-e2e-'));
  const workspace = path.join(tempRoot, 'project');
  await mkdir(workspace, { recursive: true });

  await Promise.all(
    Object.entries(structure).map(async ([relativePath, contents]) => {
      const absolute = path.join(workspace, relativePath);
      await mkdir(path.dirname(absolute), { recursive: true });
      await writeFileFs(absolute, contents);
    }),
  );

  const cleanup = async () => {
    await rm(tempRoot, { recursive: true, force: true });
  };

  return { workspace, cleanup };
}

export async function runCli(args, { cwd } = {}) {
  if (!cwd) {
    throw new Error('runCli requires a working directory.');
  }
  if (!Array.isArray(args) || args.length === 0) {
    throw new Error('No CLI arguments provided.');
  }

  const [command, ...rest] = args;
  const options = normalizeOptions(parseOptions(rest));

  if (command === 'scan') {
    await executeScan(cwd, options);
    return;
  }
  if (command === 'enforce') {
    await executeEnforce(cwd, options);
    return;
  }
  throw new Error(`Unsupported CLI command: ${command}`);
}

export function createActionSpawner(workspace) {
  return (command, args) => {
    if (command !== 'npx') {
      throw new Error(`Unsupported command: ${command}`);
    }
    const [, , ...cliArgs] = args;
    const emitter = new EventEmitter();
    runCli(cliArgs, { cwd: workspace })
      .then(() => emitter.emit('close', 0))
      .catch((error) => {
        emitter.emit('close', 1);
        process.nextTick(() => emitter.emit('error', error));
      });
    emitter.stdout = null;
    emitter.stderr = null;
    emitter.kill = () => {};
    return emitter;
  };
}

async function executeScan(cwd, options) {
  const outDir = options.out ?? '.base-lint-report';
  const reportDir = path.resolve(cwd, outDir);
  const treatNewly = options.treatNewly ?? 'warn';
  const strict = Boolean(options.strict);
  const files = await collectWorkspaceFiles(cwd);

  const cliPackage = JSON.parse(await readFile(path.join(repoRoot, 'packages/cli/package.json'), 'utf8'));
  const [{ analyze }, { createJsonReport }, { createMarkdownReport }] = await Promise.all([
    import('../../packages/cli/src/core/analyze.ts'),
    import('../../packages/cli/src/core/reporters/json.ts'),
    import('../../packages/cli/src/core/reporters/markdown.ts'),
  ]);

  const report = await analyze({
    cwd,
    files,
    strict,
    suppress: [],
    treatNewlyAs: treatNewly,
    cliVersion: cliPackage.version ?? '0.0.0',
  });

  await mkdir(reportDir, { recursive: true });
  await writeFileFs(path.join(reportDir, 'report.json'), createJsonReport(report), 'utf8');
  await writeFileFs(path.join(reportDir, 'report.md'), createMarkdownReport(report), 'utf8');

  const meta = {
    cliVersion: report.meta.cliVersion,
    datasetVersion: report.meta.datasetVersion,
    generatedAt: report.meta.generatedAt,
    config: {
      path: null,
      mode: options.mode ?? 'repo',
      strict,
      treatNewlyAs: treatNewly,
      maxLimited: 0,
      suppress: [],
      include: [],
      ignore: [],
    },
    filesAnalyzed: files,
  };
  await writeFileFs(path.join(reportDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
}

async function executeEnforce(cwd, options) {
  const { runEnforceCommand } = await import('../../packages/cli/src/commands/enforce.ts');
  const previousExitCode = process.exitCode;
  process.exitCode = 0;
  const inputPath = options.input ? path.resolve(cwd, options.input) : undefined;

  if (!inputPath) {
    throw new Error('enforce command requires an input report path.');
  }

  await runEnforceCommand({
    input: inputPath,
    maxLimited: options.maxLimited,
    failOnWarn: options.failOnWarn,
  });
  const resultingCode = process.exitCode ?? 0;
  process.exitCode = previousExitCode ?? undefined;
  if (resultingCode !== 0) {
    throw new Error(`enforce command exited with code ${resultingCode}`);
  }
}

function parseOptions(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = args[index + 1];
    if (next == null || next.startsWith('--')) {
      result[key] = true;
      continue;
    }
    result[key] = next;
    index += 1;
  }
  return result;
}

function normalizeOptions(raw) {
  const entries = Object.entries(raw).map(([key, value]) => [toCamelCase(key), value]);
  return Object.fromEntries(entries);
}

function toCamelCase(key) {
  return key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

async function collectWorkspaceFiles(cwd) {
  const results = new Set();
  await walk('.');
  return Array.from(results).sort();

  async function walk(relativeDir) {
    const absoluteDir = path.resolve(cwd, relativeDir);
    const entries = await readdir(absoluteDir, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.base-lint-report') {
          continue;
        }
        await walk(relativePath);
        continue;
      }
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.has(ext)) {
          results.add(relativePath.split(path.sep).join('/'));
        }
      }
    }
  }
}
