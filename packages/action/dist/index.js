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
var import_meta = {};
var missingTokenWarningIssued = false;
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
