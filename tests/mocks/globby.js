import { readdir } from 'node:fs/promises';
import path from 'node:path';

async function walk(directory, options, results, cwd, ignorePatterns) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (!options.dot && entry.name.startsWith('.')) {
      continue;
    }
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(cwd, absolute);

    if (shouldIgnore(relative, ignorePatterns)) {
      continue;
    }

    if (entry.isDirectory()) {
      await walk(absolute, options, results, cwd, ignorePatterns);
      continue;
    }

    if (entry.isFile()) {
      results.add(normalizePath(relative));
    }
  }
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function shouldIgnore(relativePath, patterns) {
  return patterns.some((pattern) => {
    if (pattern === '') {
      return false;
    }
    if (relativePath === pattern) {
      return true;
    }
    return relativePath.startsWith(`${pattern}/`);
  });
}

function normalizeIgnore(patterns = []) {
  return patterns.map((pattern) => {
    if (pattern.endsWith('/')) {
      return pattern.slice(0, -1);
    }
    return pattern;
  });
}

async function globby(patterns, options = {}) {
  const cwd = options.cwd ? path.resolve(options.cwd) : process.cwd();
  const results = new Set();
  const ignorePatterns = normalizeIgnore(options.ignore);
  await walk(cwd, options, results, cwd, ignorePatterns);
  return Array.from(results);
}

export default globby;
