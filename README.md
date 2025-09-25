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
npx base-lint scan --mode=diff --out .base-lint-report
npx base-lint enforce --input .base-lint-report/report.json --max-limited 0
# optional GitHub integrations
npx base-lint annotate --input .base-lint-report/report.json
npx base-lint comment --input .base-lint-report/report.md
```

## Configuration

Create an optional `base-lint.config.json` at the repository root:

```json
{
  "mode": "diff",
  "treatNewlyAs": "warn",
  "maxLimited": 0,
  "strict": false,
  "targets": "all",
  "suppress": ["css.has-selector"],
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

- `npm run build` – Compile the CLI and GitHub Action packages.
- `npm run test:unit` – Execute the mock-focused unit test suite with coverage enforcement.
- `npm run test:e2e` – Run the end-to-end scenarios against temporary workspaces.

## Testing & Coverage

All test runners are implemented as Node scripts so CI can execute them without additional tooling.

- `npm test` – Runs the full suite (unit and e2e) sequentially and fails if global coverage drops below 80%.
- `npm run coverage` – Alias for `npm test`, handy when you only need the coverage report.

The repository favors mock-heavy unit tests to keep feedback loops tight. When adding new specs, prefer mocking external services, filesystem state, and process execution unless a scenario explicitly requires real integration behavior. End-to-end tests should rely on the provided helpers in `tests/e2e` to set up isolated workspaces and clean up temporary files.

## Security & Privacy

Base Lint only analyzes files in your repository. It does not upload source files or Baseline data anywhere.

## License

[MIT](./LICENSE)
