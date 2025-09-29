# base-lint-action

GitHub Action wrapper for the `base-lint` CLI. See [`packages/cli`](../cli) for command usage.

## Usage

```yaml
- uses: ej-sanmartin/base-lint@base-lint-action-vX.Y.Z
  with:
    mode: diff
    max-limited: 0
    treat-newly-as: warn
    comment: true
    checks: true
```

The action manifest exposed to users lives at the repository root (`../../action.yml`) and re-exports the bundle built from this
workspace's sources.

## Release checklist

Before tagging a new release:

1. Run `npm run build -w packages/action` to regenerate the bundled `dist/` output consumed by both manifests.
2. Update [`../../action.yml`](../../action.yml) together with [`./action.yml`](./action.yml) so the root- and package-level metadata
   reference the same version and entrypoint.
3. Commit the refreshed bundle under `packages/action/dist` (and any manifest changes) so the published tag always includes the
   compiled JavaScript.
4. Verify CI passes to ensure the action bundle remains in sync with the TypeScript sources.

These steps mirror the repository-level guidance in the [Release the GitHub Action to the Marketplace](../../README.md#release-the-github-action-to-the-marketplace)
section.
