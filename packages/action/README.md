# base-lint-action

GitHub Action wrapper for the `base-lint` CLI. See [`packages/cli`](../cli) for command usage.

## Usage

```yaml
- uses: ej-sanmartin/base-lint@base-lint-action-vX.Y.Z
  with:
    github-token: ${{ github.token }}
    mode: diff
    max-limited: 0
    treat-newly-as: warn
    comment: true
    checks: true
    cache: true
```

The action manifest exposed to users lives at the repository root (`../../action.yml`) and re-exports the bundle built from this
workspace's sources.

### Caching

Set `cache: true` to reuse the npm directories Base Lint warms up on every run (`~/.npm/_cacache` and `~/.npm/_npx`). By default
the action derives a cache key from the bundled CLI version (`base-lint-cli-${version}`), ensuring that publishing a new action
release also busts stale caches. Override the key with `cache-key` when you need repo-specific segmentation (for example,
appending the operating system or lockfile hash), but keep the CLI version in the string so future releases continue to
invalidate old entries automatically. When `cache` is `false` or no key can be resolved, caching is skipped entirely.

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
