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

Run the CLI from the repository root to generate a report:

```bash
npm install
npx base-lint scan --mode=repo --out .base-lint-report
npx base-lint clean --out .base-lint-report
```

> **Note**
>
> The demo app depends on the published Base Lint CLI via a semver range so that you can verify what ships to npm. When working on the CLI locally, feel free to swap the dependency back to `workspace:*` to use the workspace build instead.

After installing dependencies, you can also run the bundled script directly from the demo app directory:

```bash
npm run base-lint
```
