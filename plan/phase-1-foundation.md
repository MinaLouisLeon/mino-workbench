# Phase 1 - Foundation

**Branch** `feat/git-foundation`
**Features** #8 git-aware file tree, #11 search respects `.gitignore`,
#12 branch and dirty marker in the header
**Blocked on** [D1](decisions.md#d1---what-actually-talks-to-git) and
[D2](decisions.md#d2---where-the-git-methods-live-on-the-transport)

## Goal

Put a git surface on all three transports, and prove it against three small
features rather than against tests alone. Everything after this phase inherits
its types, its error handling and its path guard, so the aim is to get those
right rather than to ship a lot of UI.

## Transport surface

Assuming D2 resolves to a separate trait:

```rust
#[async_trait]
pub trait GitTransport: Send + Sync + 'static {
    /// The repository containing the connected root, or `None` when the root
    /// is not inside one. Absence is not an error: most folders are not
    /// repositories, and the UI renders that as a quiet state.
    async fn repository(&self) -> Result<Option<GitRepository>>;

    /// The working tree as git sees it, for the whole repository.
    ///
    /// One call, not one per file: `git status --porcelain=v2 -z` answers for
    /// the entire tree in a single pass, and the tree needs every row at once
    /// to decorate itself.
    async fn status(&self) -> Result<GitStatus>;
}
```

Two methods. Everything in this phase is served by them.

## Domain types

New file `crates/mino-core/src/types/git.rs`, exported to TypeScript by
`ts-rs` like every other domain type - regenerate with `npm run gen:types`.

```rust
pub struct GitRepository {
    /// Absolute path of the work tree root. May sit above the connected root.
    pub root: String,
    /// `None` on a detached HEAD or an unborn branch.
    pub branch: Option<String>,
    pub head: Option<String>,          // short sha
    pub detached: bool,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
}

pub enum GitFileState {
    Unmodified, Modified, Added, Deleted, Renamed, Copied,
    Untracked, Ignored, Conflicted, TypeChanged,
}

pub struct GitEntry {
    pub path: String,               // absolute, the remote's separator style
    pub relative_path: String,      // repository-relative, forward slashes
    pub index: GitFileState,        // staged side
    pub worktree: GitFileState,     // unstaged side
    pub original_path: Option<String>, // renames and copies
}

pub struct GitStatus {
    pub repository: GitRepository,
    pub entries: Vec<GitEntry>,
    /// True when the walk hit git's own limits. Same honesty as SearchHits.
    pub truncated: bool,
}
```

Two states per entry, not one, because staged-and-then-modified-again is a
real and common condition, and phase 2 needs both sides to render its two
groups. Getting this wrong here would be re-litigated in every later phase.

## Shared decisions module

`crates/mino-core/src/git/` mirrors `crates/mino-core/src/search/`: the
per-transport code walks, the shared module decides. Parsing
`--porcelain=v2 -z` output into `GitEntry` lives here **once**, so local and
SSH cannot drift into disagreeing about what git said.

```
crates/mino-core/src/git/
  mod.rs        probe, repository detection, error mapping
  porcelain.rs  the --porcelain=v2 -z parser and its tests
  command.rs    argv construction; nothing here builds a shell string
```

## Implementations

| Transport | How |
| --- | --- |
| Local | `tokio::process::Command`, argv array, cwd = the guarded root |
| SSH | The existing exec channel; argv quoted by `ssh/command.rs::quote` |
| Remote agent | `Unimplemented`, via a git stub macro beside `stub.rs` |

Also: a `git` probe alongside the existing `nu` probe, so a machine without
git says so in a sentence instead of failing per call.

## UI

**#8 Git-aware file tree.** Extend the compound row with `TreeRow.GitStatus` -
a new part, never a replacement for an existing one. A letter badge (M, A, D,
U) and a tone from `theme/tokens.ts`. Ignored entries render dimmed the way
hidden ones already do. Status arrives through a new `GitStatusContext` so
rows read it rather than being handed it.

**#11 Search respects `.gitignore`.** `search::Collector` takes an optional
ignore predicate built from the status. **Must degrade**: outside a repository,
or with git absent, the existing `SKIPPED_DIRECTORIES` list stands unchanged.
Losing search entirely because a folder is not a repository would be a
regression.

**#12 Header.** Branch name, a dirty marker, and ahead/behind counts in
`WorkbenchHeader`. Watch the six-prop ceiling - pass one object or read from
context.

## Tests

**Rust** - `crates/mino-core/tests/git_status.rs`, plus a fixture module
building real repositories with `git init` in a temp dir.

- Not a repository returns `Ok(None)`, not an error.
- A clean tree returns no entries.
- Modified, added, deleted, renamed and untracked each map to the right state.
- Staged *and* then modified again reports both sides.
- Detached HEAD and an unborn branch (a fresh `git init`) both work.
- Paths outside the connected root never appear.
- `porcelain.rs` unit tests parse real recorded output, including a filename
  with a space and one with a non-ASCII character.

**TypeScript** - the fake transport grows a `git` client.

- Tree rows render the right badge for each state.
- Ignored rows are dimmed.
- Not a repository: the tree renders exactly as it does today, no badges, no
  error.
- Header shows branch, dirty marker, ahead/behind.
- Search still returns results with git absent.

## Docs

- `docs/mino-workbench/git-module.md` - the new module document.
- `docs/mino-workbench/README.md` - index row.
- `endpoints.md` - the new methods and types.
- `state-store.md` - `GitStatusContext`.
- `manual-testing.md` - a section 15.
- `CLAUDE.md` - the D2 amendment, if D2 resolves to a second trait.

## Risks

| Risk | Mitigation |
| --- | --- |
| Status on a huge repository is slow and blocks the UI | Run it off the interactive path, cap it, set `truncated`, and never block a keystroke on it |
| Refresh storms - status after every edit | Debounce, and refresh on explicit events (save, focus) rather than on a timer |
| The connected root is *below* the repository root | `GitRepository.root` is separate from the session root for exactly this reason; paths are still guarded against the session root |
| A filename containing a single quote over SSH | Refused with a typed error, as `ssh/command.rs` already does. Documented, not silently mishandled |
| git absent | Probe once; the UI says so and every git surface goes quiet |

## Out of scope

No staging, no commit, no diff, no history, no network. Read-only, one
repository, one status call.
