# Git and GitHub integration - implementation plan

Nineteen features, six phases, six branches. Nothing here is built yet: this
folder is the plan and the record of what was decided, not documentation of
working code. Module documentation lands in `docs/mino-workbench/` as each
phase ships.

## Read these first

| Document | What it covers |
| --- | --- |
| [decisions.md](decisions.md) | The three open decisions, with options and trade-offs. **Two of them gate phase 1.** |
| [feature-index.md](feature-index.md) | All nineteen features and which phase each lands in |

Then the phase you are about to build:

| Phase | Branch | Features | Size |
| --- | --- | --- | --- |
| [1 - Foundation](phase-1-foundation.md) | `feat/git-foundation` | #8, #11, #12 | L - most of the risk is here |
| [2 - Source control](phase-2-source-control.md) | `feat/git-source-control` | #1, #2, #3 | L |
| [3 - History](phase-3-history.md) | `feat/git-history` | #5, #9, #10 | M |
| [4 - Branches and stash](phase-4-branches-stash.md) | `feat/git-branches-stash` | #4, #6 | M |
| [5 - GitHub](phase-5-github.md) | `feat/github-integration` | #14, #15, #16, #18, #19 | L |
| [6 - Remote and conflicts](phase-6-remote-conflicts.md) | `feat/git-remote-conflicts` | #7, #13, #17 | L - hardest, least certain |

## Why this order

Phase 1 pays for everything after it. It settles both architectural decisions,
adds the git surface to all three transports, and carries the path guard and
error handling that every later phase inherits. Its own three features are
almost free once `status()` exists - which is the point of putting them there:
they prove the foundation against real UI instead of against a test alone.

After that the ladder climbs by risk. Phase 2 mutates the index but nothing
outside the working tree. Phase 3 is read-only. Phase 4 mutates the working
tree, so it needs care around uncommitted changes. Phase 5 leaves the machine
but stores no credential. Phase 6 holds credentials, resolves conflicts and
touches remotes - every hard thing at once, deliberately last, where the
foundation underneath it is proven.

Each phase is independently useful. Stopping after any of them leaves the app
in a coherent state, which is the property that matters if priorities change.

## Dependencies

```
phase 1  foundation ─┬─ phase 2  source control ─┬─ phase 4  branches, stash
                     │                           └─ phase 6  remote, conflicts
                     ├─ phase 3  history ──────────── phase 6  (needs diff)
                     └─ phase 5  github  (needs only the branch name)
```

Phase 5 depends on phase 1 alone, so it can jump the queue if GitHub matters
more than local git. Phase 6 wants both 2 and 3 in place first.

## How a phase ships

Same as every other change in this repo:

1. Branch off `dev`, named in the table above.
2. Build it. Regenerate types with `npm run gen:types` after any change to
   `crates/mino-core/src/types/`.
3. Push. The `pre-push` hook runs type-check, lint, Vitest, Playwright,
   `cargo fmt --check`, Clippy and the Rust suite; see `lefthook.yml`.
4. PR into `dev`. `dev` into `main` publishes a release.

## Definition of done, every phase

A phase is finished when all of this is true, not when the feature works:

- [ ] Every filesystem, process and network call goes through a transport.
      No React component and no Tauri command spawns anything.
- [ ] All three transports answer every new method - local and SSH for real,
      the remote agent with a typed `Unimplemented`.
- [ ] The path guard covers every caller-supplied path, on both transports.
- [ ] No caller value reaches a shell as syntax. Arguments are passed as argv,
      never interpolated into a command line.
- [ ] No credential, token or passphrase is written to disk, to a log, or to
      browser storage.
- [ ] Types are generated from Rust, never hand-written.
- [ ] No file over 150 lines, `.rs` and `.tsx` alike.
- [ ] Rust tests beside the crate; TypeScript tests in root `test/`.
- [ ] A module document under `docs/mino-workbench/`, and the manual QA guide
      extended with the phase's scenarios.
- [ ] `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`,
      `cargo fmt --all --check`, `cargo clippy --workspace --all-targets`,
      `cargo test --workspace --exclude mino-desktop` all clean.

## Estimating

Rough, and honest about being rough. `search_files` was one transport method
and came to about 1,500 lines including tests and docs. These numbers assume
the same standard of finish.

| Phase | New transport methods | Rough diff |
| --- | --- | --- |
| 1 | 2 | ~1,800 lines |
| 2 | 4 | ~2,000 lines |
| 3 | 4 | ~1,800 lines |
| 4 | 7 | ~1,400 lines |
| 5 | 2 (+ `gh` subcommands) | ~1,800 lines |
| 6 | 6 | ~2,000 lines |

Around 10,000 lines and 25 transport methods for all six. That total is the
argument for phases: it is not reviewable as one branch, and a design mistake
made in phase 1 and discovered in phase 5 is expensive in a way that a mistake
made and corrected inside one phase is not.
