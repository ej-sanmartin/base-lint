# Base Lint Demo App

Tiny demo project with a couple of features that Base Lint will flag:

- CSS `:has()` selector (Baseline Newly)
- `navigator.share` Web API (Baseline Limited)

```
## Base Lint Report
**Status:** ❌ Limited: 2 · ⚠️ Newly: 1 · ✅ Widely: 0

| File | Line | Feature | Baseline |
|------|------|---------|----------|
| examples/demo-app/src/app.tsx | 3 | navigator.share() | Limited |
| examples/demo-app/src/app.tsx | 4 | navigator.share() | Limited |
| examples/demo-app/src/styles.css | 1 | :has() | Newly |
```

## Configuration

The demo app ships with a ready-to-use `base-lint.config.json` that mirrors a
typical CI setup:

```jsonc
{
  "mode": "diff",            // focus on changes in pull requests
  "strict": true,             // exit with a non-zero code on Limited findings
  "treatNewlyAs": "warn",     // keep Newly findings visible without failing CI
  "maxLimited": 0,            // allow zero Limited findings in the diff
  "include": [
    "src/**/*.{ts,tsx,css}",
    "public/**/*.html"
  ],
  "ignore": [
    "**/*.test.{ts,tsx}",
    "src/mocks/**"
  ]
}
```

Drop the config into your own repository to adopt the same defaults. Tweak the
settings to match your workflow:

- Switch `mode` to `repo` for full repository scans (e.g. scheduled jobs).
- Set `treatNewlyAs` to `error` if Newly features should also fail the build, or
  to `ignore` to silence them entirely.
- Expand `include`/`ignore` patterns to match your project layout; the demo
  configuration keeps focus on source files while skipping tests and mocks.

## Running the CLI

Run the CLI from the repository root to generate a report:

```bash
npm install
npx base-lint scan --mode=repo --out .base-lint-report
npx base-lint clean --out .base-lint-report
```

> **Note**
>
> The demo app depends on the published Base Lint CLI via a semver range so that you can verify what ships to npm. When working on the CLI locally, feel free to swap the dependency back to `workspace:*` to use the workspace build instead.

After installing dependencies, you can also run Base Lint directly from the demo
app directory with the included configuration. The CLI automatically detects the
local `base-lint.config.json`, so you only need to run:

```bash
npx base-lint scan
```

Or use the bundled script:

```bash
npm run base-lint
```

Because the config defaults to `mode: diff`, the CLI scans only files changed
relative to your current Git branch. Add a staged change or append
`--mode=repo` to lint the entire workspace in one run.
