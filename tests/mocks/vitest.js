import assert from 'node:assert/strict';
import {
  afterEach as nodeAfterEach,
  beforeEach as nodeBeforeEach,
  describe as nodeDescribe,
  it as nodeIt,
  test as nodeTest,
} from 'node:test';

const activeSpies = new Set();

function createMock(initialImpl) {
  let implementation = initialImpl ?? (() => undefined);
  const defaultImpl = implementation;

  function mockFn(...args) {
    const result = implementation.apply(this, args);
    mockFn.mock.calls.push(args);
    return result;
  }

  mockFn.mock = {
    calls: [],
  };

  mockFn.mockImplementation = (fn) => {
    implementation = fn;
    return mockFn;
  };

  mockFn.mockImplementationOnce = (fn) => {
    const originalImpl = implementation;
    implementation = (...args) => {
      implementation = originalImpl;
      return fn(...args);
    };
    return mockFn;
  };

  mockFn.mockReturnValue = (value) => {
    implementation = () => value;
    return mockFn;
  };

  mockFn.mockResolvedValue = (value) => {
    implementation = () => Promise.resolve(value);
    return mockFn;
  };

  mockFn.mockRejectedValue = (value) => {
    implementation = () => Promise.reject(value);
    return mockFn;
  };

  mockFn.mockClear = () => {
    mockFn.mock.calls.length = 0;
    return mockFn;
  };

  mockFn.mockReset = () => {
    mockFn.mock.calls.length = 0;
    implementation = defaultImpl;
    return mockFn;
  };

  return mockFn;
}

function toErrorMatcher(matcher) {
  if (!matcher) {
    return () => true;
  }
  if (matcher instanceof RegExp) {
    return (error) => matcher.test(error.message);
  }
  if (typeof matcher === 'string') {
    return (error) => error.message.includes(matcher);
  }
  if (typeof matcher === 'function') {
    return matcher;
  }
  return () => false;
}

function createExpect(received) {
  const expectApi = {
    toBe(expected) {
      assert.strictEqual(received, expected);
    },
    toEqual(expected) {
      assert.deepEqual(received, expected);
    },
    toBeUndefined() {
      assert.strictEqual(received, undefined);
    },
    toBeNull() {
      assert.strictEqual(received, null);
    },
    toBeDefined() {
      assert.notStrictEqual(received, undefined);
    },
    toContain(expected) {
      if (typeof received === 'string' || Array.isArray(received)) {
        assert.ok(received.includes(expected));
      } else {
        throw new TypeError('Received value does not support toContain');
      }
    },
    toHaveBeenCalledTimes(times) {
      if (!received || typeof received !== 'function' || !received.mock) {
        throw new TypeError('Expected a vi.fn() or spy for toHaveBeenCalledTimes');
      }
      assert.strictEqual(received.mock.calls.length, times);
    },
    toThrow(matcher) {
      if (typeof received !== 'function') {
        throw new TypeError('toThrow matcher requires a function');
      }
      let error;
      try {
        received();
      } catch (err) {
        error = err;
      }
      assert.ok(error instanceof Error, 'Expected function to throw');
      const matches = toErrorMatcher(matcher);
      assert.ok(matches(error), `Error did not match expected matcher: ${error?.message ?? 'unknown'}`);
    },
  };

  expectApi.resolves = {
    async toBeUndefined() {
      const value = await received;
      assert.strictEqual(value, undefined);
    },
    async toEqual(expected) {
      const value = await received;
      assert.deepEqual(value, expected);
    },
  };

  expectApi.rejects = {
    async toThrow(matcher) {
      let error;
      try {
        await received;
      } catch (err) {
        error = err;
      }
      assert.ok(error instanceof Error, 'Expected promise to reject');
      const matches = toErrorMatcher(matcher);
      assert.ok(matches(error), `Error did not match expected matcher: ${error?.message ?? 'unknown'}`);
    },
  };

  return expectApi;
}

export const vi = {
  fn(impl) {
    return createMock(impl);
  },
  spyOn(target, method) {
    const original = target[method];
    const spy = createMock(function (...args) {
      return original.apply(target, args);
    });

    const restore = () => {
      target[method] = original;
      activeSpies.delete(restore);
    };

    spy.mockRestore = restore;
    activeSpies.add(restore);

    target[method] = function (...args) {
      return spy.apply(target, args);
    };

    return spy;
  },
  restoreAllMocks() {
    for (const restore of Array.from(activeSpies)) {
      restore();
    }
    activeSpies.clear();
  },
};

export const expect = (value) => createExpect(value);
export const test = nodeTest;
export const it = nodeIt;
export const describe = nodeDescribe;
export const afterEach = nodeAfterEach;
export const beforeEach = nodeBeforeEach;
