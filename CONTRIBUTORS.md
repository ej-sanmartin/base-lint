# Contributors Guide

This guide consolidates the workflows and expectations for people contributing to Base Lint.

## Contributing

We welcome pull requests! Before opening one:

1. Fork the repository and create a feature branch off `main`.
2. Follow the development setup below to install dependencies and run the test suites locally.
3. Keep changes focused—open separate PRs for unrelated fixes or enhancements.
4. Adhere to the existing code style and prefer mock-driven tests so suites stay fast and deterministic.

If you plan to work on a sizeable feature, consider opening an issue first to discuss the approach.

## Development Setup

```bash
git clone https://github.com/your-org/base-lint.git
cd base-lint
npm install
```

Useful commands while developing:

- `npm run build` – Compile both packages (`packages/cli` and `packages/action`).
- `npm run build -w packages/cli` – Rebuild just the CLI bundle (emits `packages/cli/dist/index.js`).
- `npm run build -w packages/action` – Rebuild just the GitHub Action bundle (emits `packages/action/dist/index.js`).
- `npm run test:unit` – Execute the Node Test Runner-based unit suite with coverage enforcement.
- `npm run test:e2e` – Run the end-to-end scenarios against temporary workspaces.
- `npm test` – Run unit + e2e suites sequentially (same as `npm run coverage`).

To execute an individual spec with Node's test runner (useful while iterating on a single file), point the command at the repository's loader so TypeScript modules and aliases resolve correctly:

```bash
node --test --import tsx --experimental-loader ./tests/loaders/vitest-loader.mjs packages/cli/src/__tests__/feature-map.test.ts
```

## Testing & Coverage

All test runners are implemented as Node scripts so CI can execute them without additional tooling. After the Vitest suites were retired, the repository relies entirely on the Node Test Runner and mocks under `tests/mocks`.

- `npm test` / `npm run coverage` – Runs the full suite (unit and e2e) sequentially and fails if global coverage drops below 80%.
- `npm run test:unit` – Targets the fast unit suite driven by the Node Test Runner.
- `npm run test:e2e` – Executes the slower end-to-end coverage that shells out to the real CLI.

The repository favors mock-heavy unit tests to keep feedback loops tight. When adding new specs, prefer mocking external services, filesystem state, and process execution unless a scenario explicitly requires real integration behavior. End-to-end tests should rely on the provided helpers in `tests/e2e` to set up isolated workspaces and clean up temporary files.

## Publishing

### Release the CLI to npm

1. Update the version in `packages/cli/package.json` (and changelog, if applicable).
2. Run `npm run build -w packages/cli` to regenerate `packages/cli/dist/index.js` (includes the executable shebang).
3. From the repo root, publish with `npm publish --workspace packages/cli --access public`.
4. Tag the release (`git tag cli-vX.Y.Z && git push origin cli-vX.Y.Z`).

### Release the GitHub Action to the Marketplace

1. Update the version in `packages/action/package.json`, `packages/action/action.yml`, and the root [`action.yml`](./action.yml) so both manifests stay in sync.
2. Rebuild the bundle with `npm run build -w packages/action` and commit the resulting `packages/action/dist` output.
3. Verify the tag naming matches the `base-lint-action-v*` pattern before publishing (for example, `git tag --list 'base-lint-action-v*'`).
4. Create a Git tag (`git tag base-lint-action-vX.Y.Z && git push origin base-lint-action-vX.Y.Z`).
5. Draft a GitHub release that points to the new tag—Marketplace listings pick up the bundled `dist/` assets automatically.

Refer to the [`packages/action` release checklist](packages/action/README.md#release-checklist) for the package-level perspective on the same workflow.
