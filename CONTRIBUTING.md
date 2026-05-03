# Contributing to LIQAA JS SDK

Thanks for your interest. The SDK is open-source (MIT) and we welcome PRs, bug reports, and feature requests.

## Quick start

```bash
git clone https://github.com/hartemyaakoub/liqaa-js.git
cd liqaa-js
npm install
npm run dev      # local dev with example app
npm test         # run tests
npm run build    # produce dist/sdk.js + types
```

## Repository layout

```
liqaa-js/
├── src/                   # TypeScript sources
│   ├── index.ts           # public entry
│   ├── client.ts          # LIQAAClient class
│   ├── ui/                # bubble + panel UI
│   ├── network/           # API client, JWT decoder
│   └── types.ts           # public types
├── examples/              # framework integration samples
├── dist/                  # built output (gitignored)
├── test/                  # vitest specs
└── public/sdk.js          # standalone IIFE build (served at liqaa.io/sdk.js)
```

## Branching model

- **`main`** — production-ready. Tagged releases ship from here.
- **`next`** — pre-release / breaking changes.
- **Feature branches** — `feat/<name>`, `fix/<name>`, `docs/<name>`.

PRs target `main` (or `next` for breaking changes). Squash-merge is the default.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add data-locale attribute to script tag
fix: prevent double-init when script loaded twice
docs: clarify pk vs sk separation in README
chore: bump deps
```

## Testing

- **Unit tests** with [Vitest](https://vitest.dev) — `npm test`
- **Browser smoke** with [Playwright](https://playwright.dev) — `npm run test:e2e`

A PR must keep tests green and not reduce coverage.

## Style

- TypeScript strict mode
- ESLint (config provided)
- Prettier on save
- 2-space indent, semicolons required
- Public APIs **must** include JSDoc

## Reporting bugs

Open an [issue](https://github.com/hartemyaakoub/liqaa-js/issues) with:

1. **What you did** (minimal repro)
2. **What you expected**
3. **What happened** (error message, browser version)
4. SDK version (`@liqaa/js@x.y.z`)

## Security issues

Do **not** file public issues for security bugs. See [SECURITY.md](./SECURITY.md).

## License

By contributing you agree that your contributions are licensed under the MIT License (same as the project).
