<p align="center">
  <img src="apps/desktop/src-tauri/icons/128x128.png" width="96" height="96" alt="">
</p>

<h1 align="center">Mino Workbench</h1>

> A three-pane Nushell workbench: an interactive terminal, a lazy-loaded file
> tree and an editor, over one transport interface.

Local and SSH sessions both work end to end. The remote-agent transport is
wired and compiling, and answers with a typed "not implemented yet" rather
than failing at run time.

## What it does

- **Terminal** — Nushell in a real PTY, split into up to four shells side by
  side. Falls back to your platform's default shell when `nu` is absent, and
  says so.
- **File tree** — lazy-loaded one directory at a time, never a recursive walk.
- **Editor** — read and save, with syntax highlighting by extension.
- **Over SSH** — the same three panes against a remote host. Files go over
  SFTP, shells over SSH channels.

## The rule it is built around

> Every filesystem, PTY and shell call goes through one `Transport` interface.

No UI component and no Tauri command touches the filesystem or spawns a
process. Three implementations exist so the interface is proven against three
shapes rather than fitted to one.

| Path | What it is |
| --- | --- |
| `crates/mino-core` | The transport trait, its three implementations, the domain types |
| `crates/mino-agent` | Standalone daemon serving the transport surface over WebSocket + HTTP, loopback only |
| `apps/desktop` | Tauri v2 app; its Rust side is command dispatch and nothing else |
| `apps/ui` | React + TypeScript + Vite: the three panes and the transport client |

Rust owns the domain types; TypeScript is generated from them with `ts-rs`
(`npm run gen:types`) so the two cannot drift.

## Getting started

```bash
npm install
npm run desktop     # Tauri window against the Vite dev server
```

Needs Node 20.11+ and the Rust toolchain in `rust-toolchain.toml`. Nushell is
optional: without `nu` on the PATH the terminal falls back to your default
shell and the file tree falls back to a plain filesystem listing.

On Windows, MSVC is the supported toolchain. Building on `windows-gnu` works
too but has three sharp edges — see
[Building on Windows](docs/mino-workbench/README.md#building-on-windows).

| Command | What it does |
| --- | --- |
| `npm run desktop` | The desktop app |
| `npm run dev` | The UI alone in a browser, against the agent transport |
| `npm run agent` | The daemon on `127.0.0.1:8731` |
| `npm test` | Vitest |
| `npm run test:e2e` | Playwright |
| `npm run gen:types` | Regenerate the TypeScript domain types from Rust |
| `npm run typecheck` | `tsc --noEmit` over the whole repo, tests included |
| `npm run lint` | ESLint, warnings treated as errors |

### Before you push

`npm install` installs a `pre-push` hook (lefthook) that runs exactly what the
release workflow's `verify` job runs: type-check, lint, Vitest, Playwright,
`cargo fmt --check`, Clippy and the Rust tests. It stops at the first failure
and takes about a minute on a warm cache, so a branch that pushes clean does
not turn the release red on something a local check would have caught.

The hook lives in [`lefthook.yml`](lefthook.yml). `git push --no-verify` skips
it for a work-in-progress branch; `LEFTHOOK=0 git push` skips every hook.

One thing worth knowing: the type-check that matters is the root one. Each
workspace has its own narrower `tsconfig.json` - `apps/ui`'s does not cover
`test/` - so `npm run typecheck` at the root is the only one that sees
everything CI sees.

## Documentation

Architecture, the transport method map, the agent's endpoints, per-flow
component trees and the manual QA guide live in
[`docs/mino-workbench/`](docs/mino-workbench/README.md).

Conventions and the architectural rule are in [`CLAUDE.md`](CLAUDE.md).

## Security posture

- **The agent daemon has no authentication**, so it binds to loopback only and
  refuses a routable bind address outright. Do not expose its port; tunnel
  over SSH if you need it from elsewhere.
- Filesystem access — reads *and* writes — is confined to the folder you open.
  A path that resolves outside it is refused before any syscall.
- SSH host keys are checked against `known_hosts`. An unknown or changed key
  is refused; there is no accept-anything mode and no trust-on-first-use.
- Authentication is a key file or an SSH agent. No password or passphrase is
  ever requested, held, or written anywhere.
- Caller values never reach a shell command line. The structured Nushell
  channel binds them as environment variables locally, and sends them over
  stdin as JSON remotely.
- Saving refuses to overwrite a file that changed since it was opened.
- Local storage holds layout preferences and nothing else.

## Releases

Merging `dev` into `main` is the whole release process. From there
[the workflow](.github/workflows/release-windows.yml) does the rest with no
manual step:

1. verifies the branch - types, lint, tests, clippy, formatting;
2. bumps the patch version in `tauri.conf.json`, `Cargo.toml` and both
   `package.json` files together, via `scripts/bump-version.mjs`;
3. clears any previous bundle output, then builds the Windows `.exe`;
4. commits the bump back to `main`, tags it `v<version>`, and publishes a
   release with the installer attached.

Windows is the only target in this version.

The order matters: the installer is built **before** the bump is pushed, so a
failed build leaves `main` untouched rather than bumped to a version that
never shipped. The bundle directory is cleared first because the build cache
can still hold the previous version's installer, and releasing the wrong one
would be worse than a slow build.

To move the minor or major version instead of the patch, run the workflow by
hand from the Actions tab and pick the part to bump.

Past releases keep their installers, so an older version stays downloadable.

Builds are **not code-signed**, so Windows SmartScreen warns on first run.

## Status

Phase 1 and 2 are done: local and SSH transports, the editor, terminal splits.
Not built yet, and typed as such rather than pretended:

- the remote-agent transport,
- authentication for the agent daemon.

## License

[MIT](LICENSE)
