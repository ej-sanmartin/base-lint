"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  runBaseLint: () => runBaseLint
});
module.exports = __toCommonJS(index_exports);
var cache = __toESM(require("@actions/cache"));

// virtual:@actions/core
var core_exports = {};
__export(core_exports, {
  error: () => error,
  getBooleanInput: () => getBooleanInput,
  getInput: () => getInput,
  info: () => info,
  setFailed: () => setFailed,
  warning: () => warning
});
var INPUT_PREFIX = "INPUT_";
function toEnvKey(name) {
  return `${INPUT_PREFIX}${name.replace(/ /g, "_")}`.toUpperCase();
}
function readInput(name, options = {}) {
  const envKey = toEnvKey(name);
  const raw = process.env[envKey] ?? "";
  const trimWhitespace = options.trimWhitespace ?? true;
  return trimWhitespace ? raw.trim() : raw;
}
function getInput(name, options) {
  const value = readInput(name, options);
  if (!value && options?.required) {
    throw new Error(`Input required and not supplied: ${name}`);
  }
  return value;
}
function getBooleanInput(name, options) {
  const normalized = getInput(name, { ...options, trimWhitespace: true }).toLowerCase();
  if (!normalized) {
    return false;
  }
  if (["true", "1"].includes(normalized)) {
    return true;
  }
  if (["false", "0"].includes(normalized)) {
    return false;
  }
  throw new TypeError(`Input does not meet boolean requirements: ${name}`);
}
function info(message) {
  console.log(message);
}
function warning(message) {
  console.warn(message);
}
function error(message) {
  console.error(message);
}
function setFailed(message) {
  const output = message instanceof Error ? message.message : String(message);
  console.error(output);
  process.exitCode = 1;
}

// virtual:@actions/github
var import_fs = __toESM(require("fs"));
function loadEventPayload() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath) {
    try {
      const file = import_fs.default.readFileSync(eventPath, "utf8");
      return JSON.parse(file);
    } catch (error2) {
      console.warn("Failed to read GitHub event payload:", error2);
    }
  }
  const rawPayload = process.env.GITHUB_EVENT_PAYLOAD;
  if (rawPayload) {
    try {
      return JSON.parse(rawPayload);
    } catch (error2) {
      console.warn("Failed to parse GITHUB_EVENT_PAYLOAD:", error2);
    }
  }
  return {};
}
var context = {
  payload: loadEventPayload()
};

// src/index.ts
var import_child_process = require("child_process");
var import_path = __toESM(require("path"));
var import_url = require("url");

// ../cli/package.json
var package_default = {
  name: "base-lint",
  version: "1.1.2",
  description: "Lint your repo against Web Baseline policies",
  license: "MIT",
  bugs: {
    url: "https://github.com/ej-sanmartin/base-lint/issues"
  },
  homepage: "https://github.com/web-baseline/base-lint#readme",
  repository: {
    type: "git",
    url: "https://github.com/ej-sanmartin/base-lint",
    directory: "packages/cli"
  },
  funding: {
    type: "individual",
    url: "https://Ko-fi.com/esanmartin"
  },
  type: "module",
  bin: {
    "base-lint": "dist/index.js"
  },
  files: [
    "dist"
  ],
  imports: {
    vitest: "../../tests/mocks/vitest.js"
  },
  scripts: {
    build: "tsup --config tsup.config.ts",
    dev: "tsx src/index.ts --help",
    prepublishOnly: "npm run build"
  },
  dependencies: {
    "@typescript-eslint/typescript-estree": "^6.21.0",
    commander: "^11.1.0",
    globby: "^13.2.2",
    ignore: "^5.3.1",
    minimatch: "^9.0.3",
    "node-html-parser": "^6.1.11",
    picocolors: "^1.0.0",
    postcss: "^8.4.35",
    "web-features": "^2.0.0"
  },
  devDependencies: {
    "@types/node": "^20.11.30",
    tsup: "^8.0.1",
    tsx: "^4.7.1",
    typescript: "^5.4.2"
  },
  keywords: [
    "lint",
    "baseline",
    "eslint",
    "stylelint",
    "typescript",
    "javascript",
    "css",
    "cli",
    "ci",
    "bot",
    "static-analysis",
    "code-quality",
    "code-style",
    "automation",
    "best-practices"
  ]
};

// src/index.ts
var import_meta = {};
var missingTokenWarningIssued = false;
var BUNDLED_CLI_VERSION = package_default.version ?? "";
var DEFAULT_CACHE_KEY = BUNDLED_CLI_VERSION ? `base-lint-cli-${BUNDLED_CLI_VERSION}` : void 0;
function resolveCachePaths() {
  const homeDir = process.env.HOME ?? process.env.USERPROFILE;
  if (!homeDir) {
    return [];
  }
  return [import_path.default.join(homeDir, ".npm", "_cacache"), import_path.default.join(homeDir, ".npm", "_npx")];
}
function resolveCacheKey(inputKey) {
  if (inputKey) {
    return inputKey;
  }
  return DEFAULT_CACHE_KEY;
}
function resolveGithubToken() {
  const inputToken = getInput("github-token");
  const envToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const resolvedToken = inputToken || envToken;
  if (!resolvedToken && !missingTokenWarningIssued) {
    warning(
      "No GitHub token supplied. Provide one via `with: github-token: ${{ github.token }}` or set the `GITHUB_TOKEN` environment variable to enable annotations and comments."
    );
    missingTokenWarningIssued = true;
  }
  return resolvedToken;
}
async function main() {
  try {
    const mode = getInput("mode") || "diff";
    const maxLimited = getInput("max-limited") || "0";
    const treatNewlyAs = getInput("treat-newly-as") || "warn";
    const shouldComment = getBooleanInput("comment");
    const shouldAnnotate = getBooleanInput("checks");
    const shouldCache = getBooleanInput("cache");
    const cacheKeyInput = getInput("cache-key");
    const resolvedCacheKey = resolveCacheKey(cacheKeyInput || void 0);
    const cachePaths = resolveCachePaths();
    const cacheFeatureAvailable = typeof cache.isFeatureAvailable === "function" ? cache.isFeatureAvailable() : false;
    const cachingEnabled = Boolean(
      shouldCache && resolvedCacheKey && cachePaths.length > 0 && cacheFeatureAvailable
    );
    if (shouldCache && !resolvedCacheKey) {
      info("Caching requested but no cache key resolved. Skipping restore.");
    } else if (shouldCache && cachePaths.length === 0) {
      info("Caching requested but no cache paths resolved. Skipping restore.");
    } else if (shouldCache && !cacheFeatureAvailable) {
      info("Caching requested but the feature is unavailable on this runner. Skipping restore.");
    }
    let restoredCacheKey;
    if (cachingEnabled) {
      try {
        restoredCacheKey = await cache.restoreCache(cachePaths, resolvedCacheKey);
        if (restoredCacheKey) {
          info(`Restored npm cache with key ${restoredCacheKey}.`);
        } else {
          info(`No npm cache found for key ${resolvedCacheKey}.`);
        }
      } catch (error2) {
        warning(`Failed to restore npm cache: ${error2.message}`);
      }
    }
    const reportDir = ".base-lint-report";
    const reportJson = import_path.default.join(reportDir, "report.json");
    const reportMd = import_path.default.join(reportDir, "report.md");
    await runBaseLint(["scan", "--mode", mode, "--out", reportDir, "--treat-newly", treatNewlyAs]);
    let enforcementFailed = false;
    try {
      const enforceArgs = ["enforce", "--input", reportJson, "--max-limited", maxLimited];
      if (treatNewlyAs === "error") {
        enforceArgs.push("--fail-on-warn");
      }
      await runBaseLint(enforceArgs);
    } catch (error2) {
      enforcementFailed = true;
      error(error2.message);
    }
    const pr = context.payload.pull_request;
    const isFork = Boolean(
      pr?.head?.repo?.full_name && pr?.base?.repo?.full_name && pr.head.repo.full_name !== pr.base.repo.full_name
    );
    if (shouldAnnotate && !isFork) {
      try {
        await runBaseLint(["annotate", "--input", reportJson]);
      } catch (error2) {
        warning(`Failed to publish annotations: ${error2.message}`);
      }
    } else if (shouldAnnotate) {
      info("Skipping annotations for forked pull request.");
    }
    if (shouldComment && pr && !isFork) {
      try {
        await runBaseLint(["comment", "--input", reportMd]);
      } catch (error2) {
        warning(`Failed to post sticky comment: ${error2.message}`);
      }
    } else if (shouldComment && isFork) {
      info("Skipping sticky comment for forked pull request.");
    } else if (shouldComment && !pr) {
      info("Skipping sticky comment: no pull request context available.");
    }
    if (enforcementFailed) {
      setFailed("Baseline policy violated. See report for details.");
    }
    if (cachingEnabled && !restoredCacheKey) {
      try {
        await cache.saveCache(cachePaths, resolvedCacheKey);
        info(`Saved npm cache with key ${resolvedCacheKey}.`);
      } catch (error2) {
        if (error2 instanceof cache.ReserveCacheError || error2 instanceof cache.ValidationError) {
          info(`Skipping cache save: ${error2.message}`);
        } else if (error2.message?.includes("Cache already exists")) {
          info(`Skipping cache save: ${error2.message}`);
        } else {
          warning(`Failed to save npm cache: ${error2.message}`);
        }
      }
    }
  } catch (error2) {
    setFailed(error2.message);
  }
}
async function runBaseLint(args, deps = {}) {
  const coreApi = deps.core ?? core_exports;
  const spawnFn = deps.spawn ?? import_child_process.spawn;
  coreApi.info(`Running base-lint ${args.join(" ")}`);
  await new Promise((resolve, reject) => {
    const githubToken = resolveGithubToken();
    const childEnv = { ...process.env };
    if (githubToken) {
      childEnv.GITHUB_TOKEN = githubToken;
      childEnv.GH_TOKEN = githubToken;
    }
    const proc = spawnFn("npx", ["--yes", "base-lint", ...args], {
      stdio: "inherit",
      env: childEnv
    });
    proc.on("error", (error2) => reject(error2));
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`base-lint ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}
var entryFile = process.argv[1];
if (entryFile) {
  const entryUrl = (0, import_url.pathToFileURL)(entryFile).href;
  let isDirectEsmExecution = false;
  try {
    isDirectEsmExecution = entryUrl === import_meta.url;
  } catch {
  }
  const isDirectCjsExecution = typeof require !== "undefined" && require.main === module;
  if (isDirectEsmExecution || isDirectCjsExecution) {
    void main();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  runBaseLint
});
