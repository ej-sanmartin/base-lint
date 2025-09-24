import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';

import { logger } from '../logger.js';

function createConsoleMock(method: 'log' | 'warn' | 'error') {
  const spy = mock.method(console, method, () => {});
  return spy;
}

test('logger.info writes blue prefix to console.log', () => {
  const spy = createConsoleMock('log');
  logger.info('hello world');
  try {
    assert.equal(spy.mock.calls.length, 1);
    const [message] = spy.mock.calls[0].arguments as [string];
    assert.ok(message.includes('[base-lint]'));
    assert.ok(message.includes('hello world'));
  } finally {
    spy.mock.restore();
  }
});

test('logger.warn writes to console.warn', () => {
  const spy = createConsoleMock('warn');
  logger.warn('careful');
  try {
    assert.equal(spy.mock.calls.length, 1);
    const [message] = spy.mock.calls[0].arguments as [string];
    assert.ok(message.includes('[base-lint]'));
    assert.ok(message.includes('careful'));
  } finally {
    spy.mock.restore();
  }
});

test('logger.error writes to console.error', () => {
  const spy = createConsoleMock('error');
  logger.error('boom');
  try {
    assert.equal(spy.mock.calls.length, 1);
    const [message] = spy.mock.calls[0].arguments as [string];
    assert.ok(message.includes('[base-lint]'));
    assert.ok(message.includes('boom'));
  } finally {
    spy.mock.restore();
  }
});
