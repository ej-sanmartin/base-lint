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

## Security & Privacy

Base Lint only analyzes files in your repository. It does not upload source files or Baseline data anywhere.

## License

[MIT](./LICENSE)
