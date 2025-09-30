import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import type { SpawnOptions } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const coreModule = require('@actions/core') as typeof import('@actions/core');
import { context as githubContext } from '@actions/github';

import { runBaseLint } from '../index.js';

process.env.INPUT_CHECKS = process.env.INPUT_CHECKS ?? 'false';

type EventHandler = (...args: unknown[]) => void;
type ChildProcessLike = {
  on: (event: string, handler: EventHandler) => ChildProcessLike;
};

test('runBaseLint resolves when the CLI exits successfully', async (t) => {
  const events = new Map<string, EventHandler>();
  const spawnMock = t.mock.fn((command: string, args: string[], options: SpawnOptions) => {
    assert.equal(command, 'npx');
    assert.deepEqual(args, ['--yes', 'base-lint', 'scan', '--mode', 'diff']);
    assert.equal(options?.stdio, 'inherit');
    assert.equal(options?.env?.GITHUB_TOKEN, 'test-token');
    assert.equal(options?.env?.GH_TOKEN, 'test-token');
    return createChildProcess(events);
  });
  const infoMock = t.mock.fn();

  assert.deepEqual(githubContext.payload, {});

  const originalToken = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = 'test-token';
  t.after(() => {
    process.env.GITHUB_TOKEN = originalToken;
  });

  const promise = runBaseLint(['scan', '--mode', 'diff'], {
    spawn: spawnMock,
    core: { info: infoMock },
  });

  const close = events.get('close');
  assert.ok(close, 'close handler should be registered');
  close?.(0);

  await promise;
  assert.equal(spawnMock.mock.calls.length, 1);
  assert.equal(infoMock.mock.calls.length, 1);
});

test('runBaseLint rejects when the CLI exits with a non-zero code', async (t) => {
  const events = new Map<string, EventHandler>();
  const spawnMock = t.mock.fn(() => createChildProcess(events));
  const infoMock = t.mock.fn();
  mockWarning(t);

  const originalToken = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;
  t.after(() => {
    if (originalToken === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = originalToken;
    }
  });

  const promise = runBaseLint(['enforce'], {
    spawn: spawnMock,
    core: { info: infoMock },
  });

  const close = events.get('close');
  assert.ok(close, 'close handler should be registered');
  close?.(2);

  await assert.rejects(promise, /exited with code 2/);
});

test('runBaseLint rejects when the process emits an error event', async (t) => {
  const events = new Map<string, EventHandler>();
  const spawnMock = t.mock.fn(() => createChildProcess(events));
  const infoMock = t.mock.fn();
  mockWarning(t);

  const originalToken = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_TOKEN;
  t.after(() => {
    if (originalToken === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = originalToken;
    }
  });

  const promise = runBaseLint(['scan'], {
    spawn: spawnMock,
    core: { info: infoMock },
  });

  const error = events.get('error');
  assert.ok(error, 'error handler should be registered');
  error?.(new Error('spawn failed'));

  await assert.rejects(promise, /spawn failed/);
});

function mockWarning(t: TestContext) {
  const descriptor = Object.getOwnPropertyDescriptor(coreModule, 'warning');
  assert.ok(descriptor && 'value' in descriptor, 'core.warning should be a method');

  const warningMock = t.mock.method(coreModule, 'warning', () => {});

  t.after(() => {
    warningMock.mock.restore();
  });
}

function createChildProcess(events: Map<string, EventHandler>): ChildProcessLike {
  return {
    on(event: string, handler: EventHandler) {
      events.set(event, handler);
      return this;
    },
  } satisfies ChildProcessLike;
}
