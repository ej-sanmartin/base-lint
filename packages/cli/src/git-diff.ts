import { promisify } from 'util';
import { exec } from 'child_process';
import path from 'path';
import { readOptionalFile } from './fs-helpers.js';

const execAsync = promisify(exec);

export async function getDiffFiles(cwd: string): Promise<string[]> {
  const headSha = (await git(['rev-parse', 'HEAD'], cwd)).trim();
  const envBaseRef = process.env.GITHUB_BASE_REF;
  const envSha = process.env.GITHUB_SHA;
  const eventBaseSha = await readBaseShaFromEvent();

  let range: string | null = null;

  if (eventBaseSha && envSha) {
    range = `${eventBaseSha}...${envSha}`;
  } else if (envBaseRef) {
    range = `origin/${envBaseRef}...${headSha}`;
  } else {
    const mergeBase = await getMergeBase(cwd).catch(() => null);
    if (mergeBase) {
      range = `${mergeBase}...${headSha}`;
    }
  }

  let diffArgs: string[];
  if (range) {
    diffArgs = ['diff', '--name-only', '--diff-filter=ACMRTUB', range];
  } else {
    diffArgs = ['diff', '--name-only', '--diff-filter=ACMRTUB', 'HEAD'];
  }

  let stdout: string;
  try {
    stdout = await git(diffArgs, cwd);
  } catch (error) {
    stdout = await git(['diff', '--name-only', '--diff-filter=ACMRTUB', 'HEAD'], cwd);
  }
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function git(args: string[], cwd: string): Promise<string> {
  const command = `git ${args.join(' ')}`;
  const { stdout } = await execAsync(command, { cwd });
  return stdout;
}

async function getMergeBase(cwd: string): Promise<string> {
  try {
    const mergeBase = (await git(['merge-base', 'HEAD', 'origin/HEAD'], cwd)).trim();
    if (mergeBase) {
      return mergeBase;
    }
  } catch (error) {
    // ignore and try fallback
  }
  const branches = ['main', 'master'];
  for (const branch of branches) {
    try {
      const mergeBase = (await git(['merge-base', 'HEAD', branch], cwd)).trim();
      if (mergeBase) {
        return mergeBase;
      }
    } catch (error) {
      // continue searching
    }
  }
  const parent = (await git(['rev-parse', 'HEAD^'], cwd)).trim();
  return parent;
}

async function readBaseShaFromEvent(): Promise<string | null> {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    return null;
  }
  try {
    const payload = await readOptionalFile(path.resolve(eventPath));
    if (!payload) {
      return null;
    }
    const parsed = JSON.parse(payload);
    const base = parsed?.pull_request?.base?.sha ?? parsed?.merge_group?.base_sha;
    return typeof base === 'string' ? base : null;
  } catch (error) {
    return null;
  }
}
