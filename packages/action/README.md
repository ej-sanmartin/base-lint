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
