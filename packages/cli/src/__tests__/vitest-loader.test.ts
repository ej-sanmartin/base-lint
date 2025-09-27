import test from 'node:test';
import assert from 'node:assert/strict';

const loaderPath = '../../../../tests/loaders/vitest-loader.mjs';

test('vitest loader short-circuits mapped specifiers', async () => {
  // @ts-expect-error importing ESM loader without type declarations
  const { resolve } = await import(loaderPath);
  let called = false;
  const result = await resolve('vitest', {}, async () => {
    called = true;
    throw new Error('nextResolve should not be called for mapped specifiers');
  });

  assert.equal(called, false);
  assert.equal(result.shortCircuit, true);
  assert.match(result.url, /tests\/mocks\/vitest\.js$/);
});

test('vitest loader delegates to the provided resolver when no alias matches', async () => {
  // @ts-expect-error importing ESM loader without type declarations
  const { resolve } = await import(loaderPath);
  let calls = 0;
  const fallback = { url: 'node:fs', shortCircuit: false };

  const result = await resolve(
    'node:fs',
    { conditions: [], parentURL: import.meta.url },
    async (...args) => {
      calls += 1;
      assert.equal(args[0], 'node:fs');
      const context = args[1];
      assert.equal(context.parentURL, import.meta.url);
      return fallback;
    },
  );

  assert.equal(calls, 1);
  assert.equal(result, fallback);
});
