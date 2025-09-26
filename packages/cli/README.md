# base-lint CLI

`base-lint` scans your repository for usage of modern Web Platform features and evaluates them against the Baseline dataset. Use it locally or in CI to make sure new features ship with fallbacks.

### Why base-lint?

- Catch Baseline gaps before they reach production by enforcing fallbacks in pull requests.
- Share actionable Markdown summaries and GitHub Checks so reviewers see the same findings.
- Automate regression protection in CI by failing builds when new incompatibilities appear.

## Table of contents

- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Installation](#installation)
- [Detailed commands](#detailed-commands)
  - [`base-lint scan`](#base-lint-scan)
  - [`base-lint enforce`](#base-lint-enforce)
  - [`base-lint annotate`](#base-lint-annotate)
  - [`base-lint comment`](#base-lint-comment)
- [Advanced usage](#advanced-usage)
  - [Configuration](#configuration)

## Prerequisites

- **Node.js 18.17+ or 20.x LTS.** The CLI depends on built-in `fetch` when creating GitHub check runs and sticky pull request comments, which is only available in maintained Node 18+/20 releases.【F:packages/cli/src/commands/annotate.ts†L94-L123】【F:packages/cli/src/commands/comment.ts†L80-L118】
- **Git available on the `PATH`.** Diff mode shells out to `git diff`/`git merge-base` to decide which files to analyze.【F:packages/cli/src/git-diff.ts†L1-L63】
- **TypeScript compatibility.** `base-lint` relies on `@typescript-eslint/typescript-estree` to parse TypeScript and JavaScript sources. The CLI suppresses the parser's unsupported TypeScript version banner by default, but effective compatibility remains tied to the versions that `@typescript-eslint/typescript-estree` supports. Using newer or older TypeScript releases may lead to parsing errors until they are adopted by the upstream parser.【F:packages/cli/README.md†L9-L15】

## Quick start

### Minimal workflow

1. **Install the CLI** (development dependency is typical for CI):

   ```bash
   npm install --save-dev base-lint
   ```

2. **Scan your repository** in diff mode to focus on the changes under review:

   ```bash
   npx base-lint scan --mode=diff --out .base-lint-report
   ```

   > 💡 **Diff vs. full scan:** Omit `--mode=diff` to analyze the entire codebase, which is helpful for scheduled audits or first-time rollouts.

3. **Interpret the results** from the generated Markdown summary:

   ```bash
   cat .base-lint-report/report.md
   ```

   - The Markdown file includes a status badge and tables you can paste into pull requests.
   - The accompanying `report.json` is consumable by automation (see [`enforce`](#base-lint-enforce)).

> ✅ **CI tip:** Cache `.base-lint-report/` between jobs so `enforce`, `annotate`, and `comment` can reuse the same scan output without rerunning analysis.

### Command cheat sheet

- [`base-lint scan`](#base-lint-scan) – Collect findings in JSON/Markdown for local or CI use.
- [`base-lint enforce`](#base-lint-enforce) – Fail fast in CI when findings exceed your thresholds.
- [`base-lint annotate`](#base-lint-annotate) – Upload inline GitHub Checks from the latest scan.
- [`base-lint comment`](#base-lint-comment) – Maintain a sticky PR summary comment.

## Installation

Install the CLI as a development dependency with your package manager of choice:

### npm

```bash
npm install --save-dev base-lint
```

### pnpm

```bash
pnpm add -D base-lint
```

### Yarn

```bash
yarn add --dev base-lint
```

Run `npx base-lint --help` (or the package manager equivalent) for the full flag list.

## Detailed commands

### `base-lint scan`

Analyze your repository (or just the current diff) and emit structured reports.

```bash
npx base-lint scan --mode=diff --out .base-lint-report
```

By default the CLI outputs to `.base-lint-report/` in the current working directory. Every run writes `report.json`, `report.md`, and `meta.json`, then prints the folder location to stdout.【F:packages/cli/src/commands/scan.ts†L23-L48】 The Markdown report includes a status summary and a table of findings that you can link from PR descriptions or surface in GitHub comments.【F:packages/cli/src/core/reporters/markdown.ts†L1-L36】

### `base-lint enforce`

Gate your CI workflow based on the JSON scan results.

```bash
npx base-lint enforce --input .base-lint-report/report.json --max-limited 0
```

`--max-limited` defaults to `0`, so the command fails if any Limited findings remain. Set `--fail-on-warn` (or configure `treatNewlyAs: "error"`) when Newly findings should also block merges.【F:packages/cli/src/commands/enforce.ts†L11-L35】

> 📈 **CI usage:** Run `scan` once per workflow and reuse its artifacts in separate `enforce`, `annotate`, or `comment` jobs to avoid redundant analysis time.

### `base-lint annotate`

Create or update a GitHub Check run with inline annotations from the scan.

```bash
npx base-lint annotate --input .base-lint-report/report.json
```

The command detects `GITHUB_TOKEN`/`GH_TOKEN`, `GITHUB_REPOSITORY`, and `GITHUB_SHA` to decide whether it can contact the GitHub Checks API; when any of them are missing (for example, when running locally) the command exits quietly.【F:packages/cli/src/commands/annotate.ts†L12-L66】 In pull-request workflows, it skips forks for safety and uploads annotations in batches of 50 by default.【F:packages/cli/src/commands/annotate.ts†L67-L142】 The resulting Check run links back to the Markdown table generated by `scan`, making it easy to jump into detailed findings.

### `base-lint comment`

Maintain a sticky pull request summary comment that mirrors the Markdown report.

```bash
npx base-lint comment --input .base-lint-report/report.md
```

The CLI reads the Markdown file, looks for `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, and `GITHUB_EVENT_NAME`, and only posts to pull-request events to avoid noise on other triggers.【F:packages/cli/src/commands/comment.ts†L10-L48】 Existing comments containing the `<!-- base-lint-sticky -->` marker are updated in place; otherwise a new comment is created.【F:packages/cli/src/commands/comment.ts†L12-L76】

## Advanced usage

Dive deeper into configuration and automation patterns once the basics are in place.

### Configuration

- **`base-lint.config.json`** – Optional configuration file resolved from the repository root (or the path you pass to `--config`). Use it to set defaults for scan mode, failure thresholds, suppressions, and path include/ignore lists.【F:packages/cli/src/config.ts†L24-L83】
- **`.base-lintignore`** – Optional ignore file that uses `.gitignore` semantics and is merged with the built-in ignore list (`node_modules/`, `dist/`, `build/`, `coverage/`, `*.min.js`).【F:packages/cli/src/config.ts†L41-L71】

Configuration files override the CLI defaults, and direct flags always win over configuration. For full option descriptions and additional examples, see the [Base Lint configuration guide](../../README.md#configuration).【F:README.md†L41-L68】
