# Base Lint

> Lint your repo against Web Baseline. PR-safe. Zero-config.

[![CI](https://img.shields.io/badge/ci-passing-green.svg)](#) [![npm](https://img.shields.io/badge/npm-base--lint-orange.svg)](https://www.npmjs.com/package/base-lint) [![GitHub release](https://img.shields.io/badge/action-base--lint--action-blue.svg)](https://github.com/marketplace/actions/base-lint-action)

![Baseline Shield Logo Thumbnail](assets/base-lint-thumbnail.png)

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
        with:
          fetch-depth: 0
      - uses: ej-sanmartin/base-lint@base-lint-action-vX.Y.Z
        with:
          github-token: ${{ github.token }}
          mode: diff
          max-limited: 0
          treat-newly-as: warn
          comment: true
          checks: true
```

Diff mode needs the base commit to be present locally, so configure `actions/checkout` with `fetch-depth: 0` (or switch Base Lint to `mode: repo`) to avoid fetching only the latest commit. Without the deeper history, Base Lint falls back to scanning nothing and reports “No files matched the scan configuration.”

The GitHub Action metadata now lives at the repository root in [`action.yml`](./action.yml) while the compiled bundle continues
to ship from [`packages/action/dist`](packages/action/dist). Build and commit the bundle whenever you update the TypeScript
sources so published tags include the refreshed JavaScript. Marketplace releases follow the `base-lint-action-v*` tag naming
rule (for example, `base-lint-action-v1.0.0`).

### CLI

```bash
npm i -D base-lint
npx base-lint init
npx base-lint scan
npx base-lint enforce
# optional GitHub integrations
npx base-lint annotate --input .base-lint-report/report.json
npx base-lint comment --input .base-lint-report/report.md
```

`base-lint init` scaffolds `base-lint.config.json`, `.base-lintignore`, and a starter GitHub Actions workflow. Re-run with `--force` to overwrite any existing files after reviewing diffs.

`base-lint enforce` automatically reads `.base-lint-report/report.json`. If `scan` writes to a custom `--out`, pass the matching `--input` when enforcing (for example, `base-lint enforce --input custom-dir/report.json`).

> ℹ️ **GitHub Actions context:** `base-lint annotate` and `base-lint comment` assume they are running inside GitHub Actions wher
e `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, `GITHUB_EVENT_NAME`, and `GITHUB_SHA` are automatically provided. Other CI or local enviro
nments must supply equivalent environment variables securely (see the [GitHub Action example](#github-action) or [`packages/acti
on/README.md`](packages/action/README.md) for how the token is issued and why forked pull requests are skipped).

`base-lint scan` prints a condensed Markdown summary to stdout after writing the reports. Pass `--print-full-report` or open `.base-lint-report/report.md` for the full table when you need additional context.

| Command | Flag | Default | Description |
| --- | --- | --- | --- |
| `scan` | `--mode <mode>` | `diff` | Analysis mode (`diff` or `repo`). |
|  | `--out <dir>` | `.base-lint-report` | Output directory for generated reports. |
|  | `--out-format <format>` | `md` | Format for stdout or `--out-file` (`md`, `json`, or `sarif`). |
|  | `--out-file <path>` | — | Write the formatted output to a single file instead of stdout. |
|  | `--strict` | `false` | Enables strict feature detection. |
|  | `--treat-newly <behavior>` | `warn` | Controls whether Newly findings warn, error, or are ignored. |
|  | `--config <path>` | — | Override path to `base-lint.config.json`. |
|  | `--print-full-report` | `false` | Prints the full Markdown report to stdout. |
| `enforce` | `--input <file>` | `.base-lint-report/report.json` | Path to a JSON report emitted by `scan` (override when `scan --out` changes). |
|  | `--max-limited <count>` | `0` | Maximum allowed Limited findings before failing. |
|  | `--fail-on-warn` | `false` | Treat Newly findings as failures. |
| `annotate` | `--input <file>` | Required | JSON report to create GitHub Checks annotations from. |
|  | `--batch-size <n>` | `50` | Number of annotations sent per API request. |
| `comment` | `--input <file>` | Required | Markdown report used for the sticky PR comment. |
|  | `--sticky-marker <marker>` | `<!-- base-lint-sticky -->` | HTML marker for locating the sticky comment. |
| `init` | `--force` | `false` | Overwrite generated config, ignore, and workflow files. |
| `clean` | `--out <dir>` | `.base-lint-report` | Report directory to delete. |

Prefer setting defaults once? Configure them in [`base-lint.config.json`](#configuration).

### SARIF workflows

Generate a SARIF report for GitHub Advanced Security by combining `--out-format` and `--out-file`:

```bash
npx base-lint scan --mode=repo --out-format=sarif --out-file=.base-lint-report/report.sarif
```

Upload the resulting file with [`github/codeql-action/upload-sarif`](https://github.com/github/codeql-action/tree/main/upload-sarif) so findings land in the **Security › Code scanning alerts** view:

```yaml
- name: Upload Base Lint SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: .base-lint-report/report.sarif
```

Need to double-check behavior manually? The snippets below satisfy the release acceptance criteria:

```bash
# Verify SARIF formatting and stdout fallback.
npx base-lint scan --out-format sarif | jq '.runs[0].tool.driver.name'

# Verify file emission when combining --out-format and --out-file.
npx base-lint scan --out-format json --out-file tmp/base-lint/report.json
cat tmp/base-lint/report.json | jq '.summary'

# Re-run init and overwrite generated scaffolding.
npx base-lint init --force
```

#### Exit codes

`base-lint scan` and `base-lint enforce` share the same policy helper so CI can react consistently. When a policy fails the CLI
prints a short explanation and sets a non-zero exit code that maps directly to your Baseline thresholds:

| Code | Meaning | Policy source |
| --- | --- | --- |
| `0` | Baseline policy satisfied. | All findings are within the configured thresholds. |
| `1` | Limited findings exceeded the allowed maximum. | `maxLimited` from config or `--max-limited`. |
| `2` | Newly findings treated as errors. | `treatNewlyAs: "error"` or `--fail-on-warn`. |
| `3` | Internal error (unexpected failure). | Invalid input, missing reports, or unhandled exceptions. |

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

Field reference:

- **`mode`** (default: `"diff"`) – Choose between scanning only the current Git diff (`"diff"`) or the entire repository (`"repo"`). Diff mode keeps pull requests focused on new changes, while repo mode is ideal for scheduled audits and initial migrations.
- **`treatNewlyAs`** (default: `"warn"`) – Decide how Newly Baseline findings behave. Use `"warn"` to surface them without breaking CI, `"error"` to fail builds that introduce Newly features, or `"ignore"` to silence them entirely when you only care about Limited gaps.
- **`maxLimited`** (default: `0`) – Set the number of Limited findings tolerated by `base-lint enforce`. Raising the threshold lets teams roll out Base Lint gradually while they pay down existing debt.
- **`strict`** (default: `false`) – Enable stricter feature detection heuristics, such as reporting computed property access. Turn this on when you want the most defensive signal, or leave it off to reduce noise from dynamic code.
- **`targets`** (default: `"all"`) – Reserved for future Baseline targeting controls. Keep the default unless you are experimenting with internal builds that scope analysis to a specific audience.
- **`suppress`** (default: `[]`) – Provide Baseline feature IDs to mute when you have hand-reviewed fallbacks or intentionally accepted risk (for example, suppressing `has` after documenting a polyfill strategy).
- **`include`** (default: `[]`) – Supply glob patterns that act as an allowlist. Leave empty to scan everything the mode selects, or narrow the scan to specific folders (e.g., `"src/**/*"`) when only part of the repo should be linted.
- **`ignore`** (default: `[]`) – Add project-wide ignore patterns that apply to every invocation. These values augment Base Lint’s built-in defaults and any `.base-lintignore` entries.

Ignore additional paths by creating `.base-lintignore` (same format as `.gitignore`). Base Lint always starts with its built-in defaults and then appends the config and ignore-file entries when assembling the matcher (see [`packages/cli/src/config.ts`](packages/cli/src/config.ts)). Default ignore entries:

```
node_modules/
dist/
build/
coverage/
*.min.js
```

Example `.base-lintignore` snippet:

```
# Skip generated Storybook output checked into docs
storybook-static/

# Drop vendored playground builds
apps/*/sandbox/dist/
```

Use the `ignore` array in `base-lint.config.json` for patterns that should travel with the repository (shared generated folders, vendored dependencies, etc.). Reach for `.base-lintignore` when individuals or ephemeral environments need extra exclusions without editing the shared config (for example, local build caches or experimental directories).

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

For contributor workflows, local setup details, test coverage guidance, and release checklists, see the [Contributors Guide](./CONTRIBUTORS.md).

## Security & Privacy

Base Lint only analyzes files in your repository. It does not upload source files or Baseline data anywhere.

## License

[MIT](./LICENSE)
