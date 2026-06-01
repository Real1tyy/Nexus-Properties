# Nexus-Properties — End-to-End Tests

Playwright + Electron specs that boot a real Obsidian binary with the plugin loaded against an isolated per-worker vault. Mirrors the [Prisma-Calendar pilot harness](../../Prisma-Calendar/e2e/README.md); the runtime conventions and decision rationale live in [`docs/e2e-testing.md`](../../docs/e2e-testing.md).

## Run locally

```bash
# default headless run
pnpm --filter nexus-properties run test:e2e

# single spec
pnpm --filter nexus-properties run test:e2e -- e2e/specs/relationships/bidirectional-parent-child.spec.ts

# verbose bootstrap + renderer logs
pnpm --filter nexus-properties run test:e2e:verbose

# headed / interactive (debugging only)
pnpm --filter nexus-properties run test:e2e:headed
pnpm --filter nexus-properties run test:e2e:debug -- e2e/setup/bootstrap.spec.ts
```

## Local notes

- First run downloads the pinned Obsidian binary via `obsidian-launcher` unless `OBSIDIAN_BIN` is set.
- Linux headless runs wrap in `xvfb-run`; install `xvfb` if missing.
- Full logs land in `e2e/.cache/last-run.log`. Traces and screenshots land in `e2e/playwright-report/`.

## Directory shape

```text
e2e/
├── fixtures/              # Nexus-specific helpers and the `test` fixture
├── setup/                 # Bootstrap gate (must pass before specs run)
├── specs/                 # User journeys grouped by area
├── obsidian-version.json  # Pinned Obsidian version
├── playwright.config.ts
└── README.md
```

The generic runtime lives in [`shared/src/testing/e2e/`](../../shared/src/testing/e2e).

## Adding a spec

1. Add a `*.spec.ts` file under `e2e/specs/<area>/`.
2. Import `{ expect, test }` from `../../fixtures/electron`.
3. Use `nexus-helpers` for vault seeding and frontmatter assertions.
4. Assert persisted state (on-disk frontmatter) as well as DOM state.

## When a spec is required

Per the monorepo [three-vehicle rule](../../docs/e2e-testing.md): every `feat:` commit touching `Nexus-Properties/src/` must add or extend a spec under `e2e/specs/**`. Bug fixes follow TDD — write a failing red spec first, then fix.
