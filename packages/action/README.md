# base-lint-action

GitHub Action wrapper for the `base-lint` CLI. See [`packages/cli`](../cli) for command usage.

## Usage

```yaml
- uses: your-org/base-lint-action@v1
  with:
    mode: diff
    max-limited: 0
    treat-newly-as: warn
    comment: true
    checks: true
```

## Release checklist

Before tagging a new release:

1. Run `npm run build -w packages/action` to regenerate the bundled `dist/` output referenced by [`action.yml`](./action.yml).
2. Commit any changes under `packages/action/dist` so the published tag always includes the compiled JavaScript.
3. Verify CI passes to ensure the action bundle remains in sync with the TypeScript sources.
