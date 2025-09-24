import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../logger.js';

interface CommentOptions {
  input: string;
  stickyMarker?: string;
}

export async function runCommentCommand(options: CommentOptions): Promise<void> {
  const cwd = process.cwd();
  const marker = options.stickyMarker ?? '<!-- base-lint-sticky -->';
  const markdownPath = path.resolve(cwd, options.input);
  const body = await fs.readFile(markdownPath, 'utf8');

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const eventName = process.env.GITHUB_EVENT_NAME;

  if (!token || !repo || !eventName) {
    logger.info('GitHub context not detected. Skipping sticky comment.');
    return;
  }

  if (!eventName.startsWith('pull_request')) {
    logger.info(`Event ${eventName} is not a pull request. Skipping comment.`);
    return;
  }

  const context = await readPullRequestContext();
  if (!context) {
    logger.info('No pull request number found in event payload. Skipping comment.');
    return;
  }
  if (context.isFork) {
    logger.info('Pull request originates from a fork. Skipping sticky comment to avoid permission issues.');
    return;
  }

  const [owner, repoName] = repo.split('/');
  const existing = await listComments(owner, repoName, context.number, token);
  const sticky = existing.find((comment) => comment.body?.includes(marker));

  if (sticky) {
    const updated = await updateComment(owner, repoName, sticky.id, body, token);
    if (updated) {
      logger.info(`Updated existing sticky comment #${sticky.id}.`);
    }
    return;
  }

  const created = await createComment(owner, repoName, context.number, body, token);
  if (created) {
    logger.info(`Created sticky comment on PR #${context.number}.`);
  }
}

interface PullRequestContext {
  number: number;
  isFork: boolean;
}

async function readPullRequestContext(): Promise<PullRequestContext | null> {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    return null;
  }
  try {
    const payload = await fs.readFile(eventPath, 'utf8');
    const data = JSON.parse(payload);
    const number = data?.pull_request?.number ?? data?.number;
    if (typeof number !== 'number') {
      return null;
    }
    const baseRepo = data?.pull_request?.base?.repo?.full_name;
    const headRepo = data?.pull_request?.head?.repo?.full_name;
    const isFork = Boolean(headRepo && baseRepo && headRepo !== baseRepo);
    return { number, isFork };
  } catch (error) {
    logger.warn(`Failed to parse GitHub event payload: ${(error as Error).message}`);
    return null;
  }
}

interface GitHubComment {
  id: number;
  body?: string;
}

async function listComments(owner: string, repo: string, issueNumber: number, token: string): Promise<GitHubComment[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`;
  const response = await githubRequest(url, token);
  if (!response.ok) {
    if (response.status === 403 || response.status === 404) {
      logger.warn(`Insufficient permissions to list comments (status ${response.status}).`);
      return [];
    }
    throw new Error(`Failed to list comments: ${response.status}`);
  }
  return (await response.json()) as GitHubComment[];
}

async function createComment(owner: string, repo: string, issueNumber: number, body: string, token: string): Promise<boolean> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
  const response = await githubRequest(url, token, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  if (!response.ok) {
    if (response.status === 403 || response.status === 404) {
      logger.warn(`Insufficient permissions to create comment (status ${response.status}).`);
      return false;
    }
    throw new Error(`Failed to create comment: ${response.status}`);
  }
  return true;
}

async function updateComment(owner: string, repo: string, commentId: number, body: string, token: string): Promise<boolean> {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/comments/${commentId}`;
  const response = await githubRequest(url, token, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  });
  if (!response.ok) {
    if (response.status === 403 || response.status === 404) {
      logger.warn(`Insufficient permissions to update comment (status ${response.status}).`);
      return false;
    }
    throw new Error(`Failed to update comment: ${response.status}`);
  }
  return true;
}

async function githubRequest(url: string, token: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('User-Agent', 'base-lint-cli');
  return fetch(url, {
    ...init,
    headers,
  });
}
