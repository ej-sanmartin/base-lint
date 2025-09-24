# Base Lint Demo App

Tiny demo project with a couple of features that Base Lint will flag:

- CSS `:has()` selector (Baseline Newly)
- `navigator.share` Web API (Baseline Limited)

Run the CLI from the repository root to generate a report:

```bash
npm install
npx base-lint scan --mode=repo --out .base-lint-report
```
