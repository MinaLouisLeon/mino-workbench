# Mino Workbench

A three-pane Nushell workbench - terminal, file tree, editor - built
as a React + TypeScript UI over a shared Rust core. The core compiles into both
a Tauri v2 desktop app and a standalone agent daemon.

**This app ships in English only.** There is no i18n library, no locale
routing, no translation files and no RTL styling. Plain English strings in
components are correct here. Keep user-facing copy shallow (a `messages.ts`, a
`copy` constant, or a props value) so a future translation pass is possible.

## The one rule

> Every filesystem, PTY and shell call goes through `mino_core::Transport`.

No React component and no Tauri command may touch the filesystem or spawn a
process. Tauri commands are dispatch only. If a pane needs data, it needs a
transport method - adding one to the trait, its three implementations, the
Tauri command list and the TypeScript client is the correct amount of work.

**Three traits, one rule.** Git is a second trait, `mino_core::GitTransport`,
reached through `Transport::git()` and mirrored in TypeScript as `client.git`.
GitHub is a third, `mino_core::GitHubTransport`, reached through
`Transport::github()` and mirrored as `client.github`. The rule above is
unchanged and covers all three: git shells out to the `git` binary and GitHub
to the `gh` CLI, both inside `mino-core`, and no component or Tauri command
spawns either. The git split is there because its eventual twenty-five methods
on one trait would make every implementation file and the stub macro grow for
reasons that have nothing to do with cohesion, and because "is there git here?"
is better answered once at the type level than by twenty-five methods each
returning a not-a-repository error. The GitHub split is the same argument for a
much smaller surface - two methods, because five features share one enumerated
query. See `plan/decisions.md` D2, `docs/mino-workbench/git-module.md` and
`docs/mino-workbench/github-module.md`.

**And one rule about credentials, which both of them keep.** Every GitHub call
goes through `gh`, and every `fetch`, `pull` and `push` goes through git's own
credential helper, the SSH agent or the OS keychain. **This application never
holds a credential of any kind** - see `plan/decisions.md` D3. That is why it
can tell you to run `gh auth login`, or to configure a helper, but can never
offer to do either for you.

Two things follow. Every remote call runs with `GIT_TERMINAL_PROMPT=0` and a
timeout, because a prompt with nowhere to go is a hang. And **no text from a
call that talked to a network reaches a message, a result or a log without
going through `crates/mino-core/src/git/redact.rs`** - a remote URL can carry a
token, and git prints remote URLs unprompted.

Three implementations exist so the interface is proven against three shapes:

| Implementation | Crate path | Status |
| --- | --- | --- |
| Local | `crates/mino-core/src/local/` | Working, git and GitHub included |
| SSH | `crates/mino-core/src/ssh/` | Working - SFTP for files, SSH channels for shells, git and `gh` |
| Remote agent | `crates/mino-core/src/remote/` | Compiles, returns `Unimplemented` |

`todo!()` and `unimplemented!()` are banned in `mino-core` (enforced by
`#![deny(clippy::todo, clippy::unimplemented)]`). An unbuilt method returns
`TransportError::Unimplemented`, which serialises to TypeScript and renders as
a sentence the user can act on.

## Layout

```
crates/mino-core/     transport trait, three implementations, domain types
                      (must not depend on Tauri or a web framework)
crates/mino-agent/    standalone daemon: WebSocket + HTTP, loopback only
apps/desktop/         Tauri v2 app; src-tauri/src/commands/ is pure dispatch
apps/ui/              React + TypeScript + Vite; the three panes
docs/mino-workbench/    module documentation and the manual test guide
test/                 every TypeScript test (see test/README.md)
```

## Types are generated, not written twice

Rust owns the domain types. `ts-rs` exports them to
`apps/ui/src/Types/generated/`, which is checked in and **never edited by
hand**. After changing anything in `crates/mino-core/src/types/` or `error.rs`:

```
npm run gen:types
```

## Project rules, mapped to this stack

These are the team's standing rules. Where a rule names a Next.js path, the
equivalent here is given.

| Rule | Where it lands here |
| --- | --- |
| API types in `src/Types/modules/api.ts`, exported via `src/Types/index.ts` | Same paths under `apps/ui/src`. The transport *is* the API: its request/response types and the `TransportClient` interface live there. Nothing declares them inline. |
| No custom Tailwind colours | `apps/ui/src/theme/tokens.ts` is the only file with a colour value. `tailwind.config.ts` reads it, and the xterm and CodeMirror themes read it by name. |
| Components stay presentational | Every pane's state, effects and event wiring live in a feature `hooks/` folder; cross-cutting hooks in `apps/ui/src/hooks/`. |
| No file over 150 lines | Applies to `.rs` as well as `.tsx`. Split into focused modules in the same folder. |
| Repeated list items are compound components | The tree row: `TreeRowProvider` plus `TreeRow.Indent/.Chevron/.Icon/.Label/.Status`, all reading React context. |
| Max 6 props | Group into one object or lift into context. |
| Never delete a component or a comment | Extend it instead. Commented-out code stays exactly as it is. |
| Tests in root `test/`, never beside source | `test/mino-workbench/`. Rust tests stay beside their crate per Cargo convention. |
| No duplication | Check `apps/ui/src/components/ui/` and `apps/ui/src/lib/` before writing anything new. |

## What must never happen

- A path outside the connected root being read. The path guard
  (`crates/mino-core/src/local/roots.rs`) canonicalises and checks containment
  before any syscall.
- A caller value interpolated into a Nushell pipeline. Values are bound as
  `$env.MINO_<KEY>` parameters; pipeline text is fixed program text.
- A caller value interpolated into a git command line. Git is called with an
  argv array of fixed program text (`crates/mino-core/src/git/command.rs`); the
  working directory is the only caller-influenced value, and over SSH it is
  single-quoted by a function that refuses what it cannot quote.
- A caller naming a `gh` subcommand. `GitHubQuery` is an enum, and the program
  text for each variant lives in `crates/mino-core/src/github/command/`. Caller
  values travel as argv; a pull request body travels on stdin.
- A remote call hanging on a prompt. `fetch`, `pull` and `push` run with
  `GIT_TERMINAL_PROMPT=0` and a ceiling, so a machine with no credential helper
  gets a sentence rather than a spinner.
- Git's own words about a remote reaching a message unredacted. A URL can carry
  a token; `git::redact` removes the userinfo from every one of them, always.
- A **force push** offered as a way out of a rejected push. It is a separate,
  separately confirmed action, and it sends `--force-with-lease` - never
  `--force`.
- A pull merging over uncommitted work. A dirty tree is refused with a sentence
  naming what to do; nothing is stashed on the reader's behalf.
- Text that came back from `gh` being rendered as markup or sent back to `gh`.
  Titles, labels and bodies are written by whoever opened the pull request or
  the issue, and are treated exactly as filenames are.
- The agent daemon binding to anything but loopback. It has no authentication
  yet and refuses a routable bind address outright.
- A credential, private key or passphrase written to disk, to a log or to
  browser storage. Local storage holds layout preferences and nothing else.
  There is no GitHub token anywhere in this app to write: `gh` keeps its own.
- An orphaned child process. Sessions are killed on close, on disconnect and
  on window destroy.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | Installs the workspace |
| `npm run desktop` | Runs the Tauri app against the Vite dev server |
| `npm run dev` | Runs the UI alone in a browser (agent transport) |
| `npm run agent` | Runs the daemon on `127.0.0.1:8731` |
| `npm run gen:types` | Regenerates the TypeScript domain types from Rust |
| `npm test` | Vitest (`test/**/*.test.*`) |
| `npm run test:e2e` | Playwright (`test/**/e2e/*.spec.ts`) |
