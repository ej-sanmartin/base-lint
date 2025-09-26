# base-lint CLI

`base-lint` scans your repository for usage of modern Web Platform features and evaluates them against the Baseline dataset. Use it locally or in CI to make sure new features ship with fallbacks.

## Installation

```bash
npm install --save-dev base-lint
```

## Commands

- `base-lint scan` – analyze the repo or current diff and emit JSON/Markdown reports.
- `base-lint enforce` – enforce policy based on a JSON report.
- `base-lint annotate` – create GitHub Checks annotations.
- `base-lint comment` – maintain a sticky pull request summary comment.

Run `npx base-lint --help` for the full flag list.

## TypeScript compatibility

`base-lint` relies on `@typescript-eslint/typescript-estree` to parse TypeScript and
JavaScript sources. The CLI suppresses the parser's unsupported TypeScript version
banner by default, but the effective compatibility remains tied to the versions that
`@typescript-eslint/typescript-estree` supports. Using newer or older TypeScript
releases may lead to parsing errors until they are adopted by the upstream parser.
