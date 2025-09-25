import { afterEach, expect, test, vi } from 'vitest';

import { logger } from '../logger.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

test('logger.info writes blue prefix to console.log', () => {
  const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
  logger.info('hello world');
  expect(spy).toHaveBeenCalledTimes(1);
  const [message] = spy.mock.calls[0];
  expect(message).toContain('[base-lint]');
  expect(message).toContain('hello world');
});

test('logger.warn writes to console.warn', () => {
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  logger.warn('careful');
  expect(spy).toHaveBeenCalledTimes(1);
  const [message] = spy.mock.calls[0];
  expect(message).toContain('[base-lint]');
  expect(message).toContain('careful');
});

test('logger.error writes to console.error', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  logger.error('boom');
  expect(spy).toHaveBeenCalledTimes(1);
  const [message] = spy.mock.calls[0];
  expect(message).toContain('[base-lint]');
  expect(message).toContain('boom');
});
