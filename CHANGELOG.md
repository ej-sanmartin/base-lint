# Changelog

## base-lint-action v1.1.0 - 2024-04-05

- **Optional npm caching.** Added `cache` and `cache-key` inputs to the GitHub Action so workflows can restore and save npm
  directories between runs. The default key now includes the bundled CLI version (`base-lint-cli-${version}`) to bust stale
  caches on release.

## v1.1.0 - 2024-04-05

- **SARIF support.** `base-lint scan` can now emit SARIF alongside Markdown and JSON so teams can upload findings to GitHub Advanced Security code scanning. The formatter pipeline was refactored to share implementation between stdout and file output.
- **Flexible report formatting.** New `--out-format` and `--out-file` flags let you stream Markdown, JSON, or SARIF to stdout or a specific path without post-processing.
- **Repository bootstrapper.** `base-lint init` creates a starter config, ignore file, and GitHub Actions workflow. Re-run with `--force` to overwrite existing files after review.
- **Consistent exit codes.** `scan` and `enforce` both map policy failures to the same documented exit codes, making CI reactions predictable.
