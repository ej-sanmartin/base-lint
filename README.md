# Base Lint

> Lint your repo against Web Baseline. PR-safe. Zero-config.

[![CI](https://img.shields.io/badge/ci-passing-green.svg)](#) [![npm](https://img.shields.io/badge/npm-base--lint-orange.svg)](#) [![GitHub release](https://img.shields.io/badge/action-base--lint--action-blue.svg)](#)

Base Lint is an open-source toolkit that keeps your pull requests honest about modern web platform usage. It scans your repo (or just the diff) for CSS selectors and Web APIs, compares them against the [Baseline](https://web.dev/baseline/) dataset, and produces actionable reports. Use it locally, wire it into CI, or drop the GitHub Action into any workflow.

> Uses Baseline data (`web-features`). Not affiliated with Google/web.dev/WebDX.

## Quickstart

### GitHub Action

```yaml
name: Base Lint
on: { pull_request: {} }
permissions:
  contents: read
  pull-requests: write
  checks: write
jobs:
  baseline:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: your-org/base-lint-action@v1
        with:
          mode: diff
          max-limited: 0
          treat-newly-as: warn
          comment: true
          checks: true
```

### CLI

```bash
npm i -D base-lint
npx base-lint scan
npx base-lint enforce --input .base-lint-report/report.json
# optional GitHub integrations
npx base-lint annotate --input .base-lint-report/report.json
npx base-lint comment --input .base-lint-report/report.md
```

`base-lint scan` prints a condensed Markdown summary to stdout after writing the reports. Pass `--print-full-report` or open `.base-lint-report/report.md` for the full table when you need additional context.

| Command | Flag | Default | Description |
| --- | --- | --- | --- |
| `scan` | `--mode <mode>` | `diff` | Analysis mode (`diff` or `repo`). |
|  | `--out <dir>` | `.base-lint-report` | Output directory for generated reports. |
|  | `--strict` | `false` | Enables strict feature detection. |
|  | `--treat-newly <behavior>` | `warn` | Controls whether Newly findings warn, error, or are ignored. |
|  | `--config <path>` | — | Override path to `base-lint.config.json`. |
|  | `--print-full-report` | `false` | Prints the full Markdown report to stdout. |
| `enforce` | `--input <file>` | Required | Path to a JSON report emitted by `scan`. |
|  | `--max-limited <count>` | `0` | Maximum allowed Limited findings before failing. |
|  | `--fail-on-warn` | `false` | Treat Newly findings as failures. |
| `annotate` | `--input <file>` | Required | JSON report to create GitHub Checks annotations from. |
|  | `--batch-size <n>` | `50` | Number of annotations sent per API request. |
| `comment` | `--input <file>` | Required | Markdown report used for the sticky PR comment. |
|  | `--sticky-marker <marker>` | `<!-- base-lint-sticky -->` | HTML marker for locating the sticky comment. |
| `clean` | `--out <dir>` | `.base-lint-report` | Report directory to delete. |

Prefer setting defaults once? Configure them in [`base-lint.config.json`](#configuration).

## Configuration

Create an optional `base-lint.config.json` at the repository root:

```json
{
  "mode": "diff",
  "treatNewlyAs": "warn",
  "maxLimited": 0,
  "strict": false,
  "targets": "all",
  "suppress": ["has"],
  "include": [],
  "ignore": []
}
```

Ignore additional paths by creating `.base-lintignore` (same format as `.gitignore`). Default ignore entries:

```
node_modules/
dist/
build/
coverage/
*.min.js
```

CLI flags override config values, and config overrides defaults.

## Packages

- `packages/cli` – the `base-lint` CLI
- `packages/action` – the GitHub Action wrapper
- `examples/demo-app` – a tiny demo application that triggers Limited and Newly findings

### Demo app Baseline snapshot

Running the CLI against `examples/demo-app` (or `npm run base-lint` from that workspace) produces a report with both Limited and Newly findings:

```
## Base Lint Report
**Status:** ❌ Limited: 2 · ⚠️ Newly: 1 · ✅ Widely: 0

| File | Line | Feature | Baseline |
|------|------|---------|----------|
| examples/demo-app/src/app.tsx | 3 | navigator.share() | Limited |
| examples/demo-app/src/app.tsx | 4 | navigator.share() | Limited |
| examples/demo-app/src/styles.css | 1 | :has() | Newly |
```

The sample highlights the Web Share API (Baseline Limited) and the CSS `:has()` selector (Baseline Newly), making it easy to validate integrations end-to-end.

## Contributing

We welcome pull requests! Before opening one:

1. Fork the repository and create a feature branch off `main`.
2. Follow the development setup below to install dependencies and run the test suites locally.
3. Keep changes focused—open separate PRs for unrelated fixes or enhancements.
4. Adhere to the existing code style and prefer mock-driven tests so suites stay fast and deterministic.

If you plan to work on a sizeable feature, consider opening an issue first to discuss the approach.

## Development Setup

```bash
git clone https://github.com/your-org/base-lint.git
cd base-lint
npm install
```

Useful commands while developing:

- `npm run build` – Compile both packages (`packages/cli` and `packages/action`).
- `npm run build -w packages/cli` – Rebuild just the CLI bundle (emits `packages/cli/dist/index.js`).
- `npm run build -w packages/action` – Rebuild just the GitHub Action bundle (emits `packages/action/dist/index.js`).
- `npm run test:unit` – Execute the Node Test Runner-based unit suite with coverage enforcement.
- `npm run test:e2e` – Run the end-to-end scenarios against temporary workspaces.
- `npm test` – Run unit + e2e suites sequentially (same as `npm run coverage`).

To execute an individual spec with Node's test runner (useful while iterating on a single file), point the command at the
repository's loader so TypeScript modules and aliases resolve correctly:

```bash
node --test --import tsx --experimental-loader ./tests/loaders/vitest-loader.mjs packages/cli/src/__tests__/feature-map.test.ts
```

## Testing & Coverage

All test runners are implemented as Node scripts so CI can execute them without additional tooling. After the Vitest suites were retired, the repository relies entirely on the Node Test Runner and mocks under `tests/mocks`.

- `npm test` / `npm run coverage` – Runs the full suite (unit and e2e) sequentially and fails if global coverage drops below 80%.
- `npm run test:unit` – Targets the fast unit suite driven by the Node Test Runner.
- `npm run test:e2e` – Executes the slower end-to-end coverage that shells out to the real CLI.

The repository favors mock-heavy unit tests to keep feedback loops tight. When adding new specs, prefer mocking external services, filesystem state, and process execution unless a scenario explicitly requires real integration behavior. End-to-end tests should rely on the provided helpers in `tests/e2e` to set up isolated workspaces and clean up temporary files.

## Publishing

### Release the CLI to npm

1. Update the version in `packages/cli/package.json` (and changelog, if applicable).
2. Run `npm run build -w packages/cli` to regenerate `packages/cli/dist/index.js` (includes the executable shebang).
3. From the repo root, publish with `npm publish --workspace packages/cli --access public`.
4. Tag the release (`git tag cli-vX.Y.Z && git push origin cli-vX.Y.Z`).

### Release the GitHub Action to the Marketplace

1. Update the version in `packages/action/package.json` and `packages/action/action.yml`.
2. Rebuild the bundle with `npm run build -w packages/action` and commit the resulting `packages/action/dist` output.
3. Create a Git tag (`git tag action-vX.Y.Z && git push origin action-vX.Y.Z`).
4. Draft a GitHub release that points to the new tag—Marketplace listings pick up the bundled `dist/` assets automatically.

## Security & Privacy

Base Lint only analyzes files in your repository. It does not upload source files or Baseline data anywhere.

## License

[MIT](./LICENSE)
