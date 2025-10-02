import * as cache from '@actions/cache';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { spawn } from 'child_process';
import path from 'path';
import { pathToFileURL } from 'url';
import baseLintPackageJson from '../../cli/package.json' assert { type: 'json' };

type RunBaseLintDeps = {
  core?: Pick<typeof core, 'info'>;
  spawn?: typeof spawn;
};

let missingTokenWarningIssued = false;

const BUNDLED_CLI_VERSION = (baseLintPackageJson as { version?: string }).version ?? '';
const DEFAULT_CACHE_KEY = BUNDLED_CLI_VERSION ? `base-lint-cli-${BUNDLED_CLI_VERSION}` : undefined;

function resolveCachePaths(): string[] {
  const homeDir = process.env.HOME ?? process.env.USERPROFILE;
  if (!homeDir) {
    return [];
  }

  return [path.join(homeDir, '.npm', '_cacache'), path.join(homeDir, '.npm', '_npx')];
}

function resolveCacheKey(inputKey: string | undefined): string | undefined {
  if (inputKey) {
    return inputKey;
  }

  return DEFAULT_CACHE_KEY;
}

function resolveGithubToken(): string | undefined {
  const inputToken = core.getInput('github-token');
  const envToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const resolvedToken = inputToken || envToken;

  if (!resolvedToken && !missingTokenWarningIssued) {
    core.warning(
      'No GitHub token supplied. Provide one via `with: github-token: ${{ github.token }}` or set the `GITHUB_TOKEN` environment variable to enable annotations and comments.'
    );
    missingTokenWarningIssued = true;
  }

  return resolvedToken;
}

async function main(): Promise<void> {
  try {
    const mode = core.getInput('mode') || 'diff';
    const maxLimited = core.getInput('max-limited') || '0';
    const treatNewlyAs = core.getInput('treat-newly-as') || 'warn';
    const shouldComment = core.getBooleanInput('comment');
    const shouldAnnotate = core.getBooleanInput('checks');
    const shouldCache = core.getBooleanInput('cache');
    const cacheKeyInput = core.getInput('cache-key');
    const resolvedCacheKey = resolveCacheKey(cacheKeyInput || undefined);
    const cachePaths = resolveCachePaths();

    const cacheFeatureAvailable =
      typeof cache.isFeatureAvailable === 'function' ? cache.isFeatureAvailable() : false;
    const cachingEnabled = Boolean(
      shouldCache && resolvedCacheKey && cachePaths.length > 0 && cacheFeatureAvailable
    );

    if (shouldCache && !resolvedCacheKey) {
      core.info('Caching requested but no cache key resolved. Skipping restore.');
    } else if (shouldCache && cachePaths.length === 0) {
      core.info('Caching requested but no cache paths resolved. Skipping restore.');
    } else if (shouldCache && !cacheFeatureAvailable) {
      core.info('Caching requested but the feature is unavailable on this runner. Skipping restore.');
    }

    let restoredCacheKey: string | undefined;

    if (cachingEnabled) {
      try {
        restoredCacheKey = await cache.restoreCache(cachePaths, resolvedCacheKey!);
        if (restoredCacheKey) {
          core.info(`Restored npm cache with key ${restoredCacheKey}.`);
        } else {
          core.info(`No npm cache found for key ${resolvedCacheKey}.`);
        }
      } catch (error) {
        core.warning(`Failed to restore npm cache: ${(error as Error).message}`);
      }
    }

    const reportDir = '.base-lint-report';
    const reportJson = path.join(reportDir, 'report.json');
    const reportMd = path.join(reportDir, 'report.md');

    await runBaseLint(['scan', '--mode', mode, '--out', reportDir, '--treat-newly', treatNewlyAs]);

    let enforcementFailed = false;
    try {
      const enforceArgs = ['enforce', '--input', reportJson, '--max-limited', maxLimited];
      if (treatNewlyAs === 'error') {
        enforceArgs.push('--fail-on-warn');
      }
      await runBaseLint(enforceArgs);
    } catch (error) {
      enforcementFailed = true;
      core.error((error as Error).message);
    }

    const pr = github.context.payload.pull_request;
    const isFork = Boolean(
      pr?.head?.repo?.full_name && pr?.base?.repo?.full_name && pr.head.repo.full_name !== pr.base.repo.full_name
    );

    if (shouldAnnotate && !isFork) {
      try {
        await runBaseLint(['annotate', '--input', reportJson]);
      } catch (error) {
        core.warning(`Failed to publish annotations: ${(error as Error).message}`);
      }
    } else if (shouldAnnotate) {
      core.info('Skipping annotations for forked pull request.');
    }

    if (shouldComment && pr && !isFork) {
      try {
        await runBaseLint(['comment', '--input', reportMd]);
      } catch (error) {
        core.warning(`Failed to post sticky comment: ${(error as Error).message}`);
      }
    } else if (shouldComment && isFork) {
      core.info('Skipping sticky comment for forked pull request.');
    } else if (shouldComment && !pr) {
      core.info('Skipping sticky comment: no pull request context available.');
    }

    if (enforcementFailed) {
      core.setFailed('Baseline policy violated. See report for details.');
    }

    if (cachingEnabled && !restoredCacheKey) {
      try {
        await cache.saveCache(cachePaths, resolvedCacheKey!);
        core.info(`Saved npm cache with key ${resolvedCacheKey}.`);
      } catch (error) {
        if (error instanceof cache.ReserveCacheError || error instanceof cache.ValidationError) {
          core.info(`Skipping cache save: ${(error as Error).message}`);
        } else if ((error as Error).message?.includes('Cache already exists')) {
          core.info(`Skipping cache save: ${(error as Error).message}`);
        } else {
          core.warning(`Failed to save npm cache: ${(error as Error).message}`);
        }
      }
    }
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}

export async function runBaseLint(args: string[], deps: RunBaseLintDeps = {}): Promise<void> {
  const coreApi = deps.core ?? core;
  const spawnFn = deps.spawn ?? spawn;

  coreApi.info(`Running base-lint ${args.join(' ')}`);
  await new Promise<void>((resolve, reject) => {
    const githubToken = resolveGithubToken();
    const childEnv = { ...process.env } as NodeJS.ProcessEnv;
    if (githubToken) {
      childEnv.GITHUB_TOKEN = githubToken;
      childEnv.GH_TOKEN = githubToken;
    }
    const proc = spawnFn('npx', ['--yes', 'base-lint', ...args], {
      stdio: 'inherit',
      env: childEnv,
    });
    proc.on('error', (error) => reject(error));
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`base-lint ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

/* c8 ignore start */
const entryFile = process.argv[1];
if (entryFile) {
  const entryUrl = pathToFileURL(entryFile).href;
  let isDirectEsmExecution = false;
  try {
    isDirectEsmExecution = entryUrl === import.meta.url;
  } catch {
    // `import.meta` is unavailable in CommonJS builds.
  }

  const isDirectCjsExecution = typeof require !== 'undefined' && require.main === module;
  if (isDirectEsmExecution || isDirectCjsExecution) {
    void main();
  }
}
/* c8 ignore end */
