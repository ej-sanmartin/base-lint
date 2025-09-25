import { expect, test, vi } from 'vitest';

import * as coreModule from '@actions/core';
import { context as githubContext } from '@actions/github';

import { runBaseLint } from '../index.ts';

test('runBaseLint resolves when the CLI exits successfully', async () => {
  const events = new Map();
  const spawnMock = vi.fn((command, args, options) => {
    expect(command).toBe('npx');
    expect(args).toEqual(['--yes', 'base-lint', 'scan', '--mode', 'diff']);
    expect(options).toEqual({ stdio: 'inherit' });
    return createChildProcess(events);
  });
  const infoMock = vi.fn();

  coreModule.getInput('mode');
  coreModule.getBooleanInput('checks');
  coreModule.warning('noop');
  coreModule.error('noop');
  coreModule.setFailed('noop');
  expect(githubContext.payload).toEqual({});

  const promise = runBaseLint(['scan', '--mode', 'diff'], {
    spawn: spawnMock,
    core: { info: infoMock },
  });

  const close = events.get('close');
  expect(close).toBeDefined();
  close?.(0);

  await expect(promise).resolves.toBeUndefined();
  expect(spawnMock).toHaveBeenCalledTimes(1);
  expect(infoMock).toHaveBeenCalledTimes(1);
});

test('runBaseLint rejects when the CLI exits with a non-zero code', async () => {
  const events = new Map();
  const spawnMock = vi.fn(() => createChildProcess(events));
  const infoMock = vi.fn();

  const promise = runBaseLint(['enforce'], {
    spawn: spawnMock,
    core: { info: infoMock },
  });

  const close = events.get('close');
  expect(close).toBeDefined();
  close?.(2);

  await expect(promise).rejects.toThrow(/exited with code 2/);
});

test('runBaseLint rejects when the process emits an error event', async () => {
  const events = new Map();
  const spawnMock = vi.fn(() => createChildProcess(events));
  const infoMock = vi.fn();

  const promise = runBaseLint(['scan'], {
    spawn: spawnMock,
    core: { info: infoMock },
  });

  const error = events.get('error');
  expect(error).toBeDefined();
  error?.(new Error('spawn failed'));

  await expect(promise).rejects.toThrow(/spawn failed/);
});

function createChildProcess(events) {
  return {
    on(event, handler) {
      events.set(event, handler);
      return this;
    },
  };
}
