# Test layout

This folder is the authoritative location for every TypeScript test in the
repo. Nothing lives next to source under `apps/ui/src`.

```
test/
  README.md              this file
  setup.ts               vitest setup: jest-dom, ResizeObserver, rAF
  <module>/
    fake-transport.ts    shared fixtures for the module (not a test file)
    fake-git.ts          the fake git surface (not a test file)
    harness.tsx          render helpers (not a test file)
    unit/*.test.ts       pure logic, hooks, transforms
    integration/*.test.tsx  component render tests
    e2e/*.spec.ts        Playwright, one spec per flow
    e2e/fixtures.ts      Playwright fixtures
```

## Rules

- **Vitest owns `*.test.ts` / `*.test.tsx`. Playwright owns `*.spec.ts`.**
  Never mix the extensions; `vitest.config.ts` excludes `e2e/`, and
  `playwright.config.ts` matches `**/e2e/*.spec.ts` only.
- **Vitest globals are off.** Import `describe`, `it`, `expect` and `vi` from
  `"vitest"` explicitly in every file.
- `unit/api-routes/*.test.ts` (with `// @vitest-environment node` on line 1) is
  reserved for HTTP route handlers. **This repo has none** - the transport is
  the API and the daemon's routes are Rust - so the folder is absent by design.
- Extend `test/setup.ts`, `vitest.config.ts` and `playwright.config.ts`; do not
  re-create them. Add each new module's `src` paths to `coverage.include`.

## Modules

| Module | Folder | Covers |
| --- | --- | --- |
| `mino-workbench` | `test/mino-workbench/` | transport client contract, tree lazy-load, viewer guards, `nu`-missing fallback, git badges and the no-git degrade, staging and the discard confirmation |

## The transport is the test seam

Every test mocks the transport by supplying a fake `TransportClient` - see
`mino-workbench/fake-transport.ts`. Nothing stubs `fetch`, `invoke` or the
filesystem. If a test cannot be written against the fake, the abstraction has
leaked and the fix belongs in the source, not in the test.

The fake's git surface defaults to **not a repository**, which is deliberate:
that is the shape every pane has to survive unchanged, so an existing test goes
on asserting the no-git rendering without having to say so. A test that wants
git passes `repository` (and optionally `status`) to `createFakeTransport`.

## Rust tests

Rust unit and integration tests live beside their crate per Cargo convention
(`crates/mino-core/tests/`, `#[cfg(test)]` modules). The rule above governs the
TypeScript side only.
