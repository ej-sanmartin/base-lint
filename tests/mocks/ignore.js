function normalize(pattern) {
  if (pattern.endsWith('/')) {
    return pattern.slice(0, -1);
  }
  return pattern;
}

function createIgnore() {
  if (process.env.BASE_LINT_E2E_DEBUG === '1') {
    console.error('[ignore stub] createIgnore called');
  }
  const patterns = new Set();
  return {
    add(input) {
      if (!input) {
        return this;
      }
      const values = Array.isArray(input) ? input : [input];
      for (const pattern of values) {
        if (typeof pattern !== 'string') {
          continue;
        }
        const trimmed = pattern.trim();
        if (trimmed.length === 0) {
          continue;
        }
        patterns.add(normalize(trimmed));
      }
      return this;
    },
    ignores(file) {
      const normalized = normalize(String(file).replace(/\\/g, '/'));
      for (const pattern of patterns) {
        if (!pattern) {
          continue;
        }
        if (normalized === pattern || normalized.startsWith(`${pattern}/`)) {
          return true;
        }
      }
      return false;
    },
  };
}

module.exports = createIgnore;
module.exports.default = createIgnore;
module.exports.__esModule = true;
