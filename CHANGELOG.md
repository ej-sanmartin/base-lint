# Changelog

## base-lint-action v1.1.1 & npm base-lint v1.2.1 - October 6th, 2025

- **Removed caching.** Ballooned bundle size by 300x for a micro optimization. Removed to reduce bloat, complexity.

## base-lint-action v1.1.0 - October 2nd, 2025

- **Optional npm caching.** Added `cache` and `cache-key` inputs to the GitHub Action so workflows can restore and save npm
  directories between runs. The default key now includes the bundled CLI version (`base-lint-cli-${version}`) to bust stale
  caches on release.

## npm base-lint v1.1.0 - October 1st, 2025

- **SARIF support.** `base-lint scan` can now emit SARIF alongside Markdown and JSON so teams can upload findings to GitHub Advanced Security code scanning. The formatter pipeline was refactored to share implementation between stdout and file output.
- **Flexible report formatting.** New `--out-format` and `--out-file` flags let you stream Markdown, JSON, or SARIF to stdout or a specific path without post-processing.
- **Repository bootstrapper.** `base-lint init` creates a starter config, ignore file, and GitHub Actions workflow. Re-run with `--force` to overwrite existing files after review.
- **Consistent exit codes.** `scan` and `enforce` both map policy failures to the same documented exit codes, making CI reactions predictable.
