import test from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';

import { __setParseImplementationForTesting, parseJavaScript } from '../utils/ast-js.js';

test('parseJavaScript disables TypeScript version warnings', (t) => {
  const consoleWarn = mock.method(console, 'warn', () => {});

  const parseSpy = mock.fn((code: string, options: Record<string, any> = {}) => {
    assert.equal(code, 'const value = 1;');
    if (options.warnOnUnsupportedTypeScriptVersion !== false) {
      console.warn('unsupported TypeScript version');
    }
    if (typeof options.loggerFn === 'function') {
      options.loggerFn('ts warning');
    }
    return {
      type: 'Program',
      body: [],
      sourceType: 'module',
      range: [0, 0],
      loc: {
        start: { line: 1, column: 0 },
        end: { line: 1, column: 0 },
      },
    } as never;
  });

  __setParseImplementationForTesting(parseSpy as any);

  t.after(() => {
    consoleWarn.mock.restore();
    __setParseImplementationForTesting(null);
  });

  const program = parseJavaScript('const value = 1;', 'file.ts');

  assert.ok(program);
  assert.equal(parseSpy.mock.calls.length, 1);
  const [, options] = parseSpy.mock.calls[0].arguments as [string, Record<string, unknown>];
  assert.equal(options.warnOnUnsupportedTypeScriptVersion, false);
  assert.equal(typeof options.loggerFn, 'function');
  assert.equal(consoleWarn.mock.calls.length, 0);
});
