# Git module

> Phase 1 of six. Read-only, one repository, one status call. No staging, no
> commit, no diff, no history, no network - see `plan/` for what lands when.

Three features fall out of a single `git status`: badges in the file tree, a
branch and dirty marker in the header, and a search walk that skips what
`.gitignore` skips. They share one call because git answers for the whole
repository in one pass, and because three readings of the same tree could
disagree with each other.

## The two questions

Git is a **second trait**, not thirteen more methods on `Transport`. See
`plan/decisions.md` D2, and the amendment in `CLAUDE.md`.

```rust
pub trait Transport {
    // ... the thirteen that already existed
    fn git(&self) -> Option<&dyn GitTransport>;
}

pub trait GitTransport {
    async fn repository(&self) -> Result<Option<GitRepository>>;
    async fn status(&self) -> Result<GitStatus>;
}
```

`repository()` has three answers and they are three different things:

| Answer | Means | What the UI does |
| --- | --- | --- |
| `Some(repository)` | A checkout | Reads `status()` and decorates |
| `None` | This folder is not one | Nothing. No badges, no header strip, no error |
| `Err(...)` | Git is missing, or said something | One sentence; every git surface stays quiet |

That third row is the whole probe. There is no `probe_git` method, because a
second way to ask would be a second thing to keep in agreement with the first:
the UI asks once, on connect, and remembers.

## Why the `git` binary

Shelling out with an **argv array**, never a command line. `git2` and `gix`
were both weighed (`plan/decisions.md` D1) and both lose on the same point:
this app has two real targets, and only shelling out serves both with one
implementation. The SSH transport runs the *remote host's* git over the exec
channel it already has, so a remote repository needs no new machinery.

The cost is that `git` must be installed. That is handled the way missing `nu`
already is: one sentence the reader can act on, not a failure per call.

## Layout

```
crates/mino-core/src/git/
  mod.rs         probe, repository detection, exit-code mapping, the root filter
  command.rs     argv construction; nothing here builds a shell string
  porcelain.rs   the --porcelain=v2 -z parser
  porcelain/tests.rs   its tests, against recorded output
  branch.rs      the `# branch.*` headers
  paths.rs       PathStyle: git's forward slashes into the target's own style
```

The split mirrors `crates/mino-core/src/search/`: the per-transport code
**runs** git, and everything it **decides** is in the shared module. Local and
SSH cannot drift into disagreeing about what git said, because neither of them
reads it.

| Transport | How | File |
| --- | --- | --- |
| Local | `tokio::process::Command`, cwd = the guarded root | `local/git.rs`, `local/git_run.rs` |
| SSH | The exec channel, cwd single-quoted | `ssh/git.rs`, `ssh/git_run.rs` |
| Remote agent | `Unimplemented`, via `unimplemented_git_transport!` | `stub_git.rs` |

## The calls

Four argv shapes, all in `git/command.rs`, all fixed program text.

| Argv | Used by | Why this shape |
| --- | --- | --- |
| `rev-parse --show-toplevel` | Both | Exit 128 saying "not a git repository" is the answer, not an error |
| `status --porcelain=v2 -z --branch -uall --ignored=matching` | `status()` | The whole working tree in one pass |
| `status --porcelain=v2 -z --branch -uno --ignored=no` | `repository()` | Headers only; skips the untracked walk, which is the expensive half |
| `status --porcelain=v2 -z -unormal --ignored=matching` | Search | The ignore rows alone |

Every one is prefixed with `--no-optional-locks`, so a background status never
takes the index lock out from under a `git commit` being typed in the terminal
pane below.

Three flags that are not decoration:

- **`-z`** makes records NUL-terminated. Without it git C-quotes any path with
  a space, a quote or a non-ASCII byte, and the parser would have to unquote
  correctly to avoid mangling real filenames.
- **`--untracked-files=all`** lists files inside an untracked directory
  individually, because the tree decorates files and not only folders.
- **`--ignored=matching`** reports a directory that matches an ignore pattern
  as one row rather than recursing, which is what keeps `node_modules` from
  becoming forty thousand rows.

`--untracked-files=no` with `--ignored=matching` is **not** available: git
refuses the combination outright, because working out what is ignored *is* the
untracked walk.

## Two states per entry

```rust
pub struct GitEntry {
    pub path: String,                  // absolute, the target's separators
    pub relative_path: String,         // repository-relative, forward slashes
    pub index: GitFileState,           // the staged side
    pub worktree: GitFileState,        // the unstaged side
    pub original_path: Option<String>, // renames and copies
}
```

Staged-and-then-modified-again is a common condition and both sides have to
survive the trip to the UI. Phase 2 groups on exactly this pair; collapsing it
here would be re-litigated by every later feature.

A row draws **one** badge, so `features/git/badges.ts` chooses: the unstaged
side wins when it has anything to say, because that is the change being made
right now; the staged side is what shows once the work tree is clean again.

## The repository root is not the session root

`GitRepository.root` is the work tree root, which may sit **above** the
connected root - opening `repo/src` is an ordinary thing to do, and git answers
for the whole tree regardless.

Rows for paths outside the session root are dropped in
`git::status_from` before the status is returned. The filter is a string
containment test rather than a canonicalising one, because it has to rule on
deleted files too and `canonicalize` has nothing to say about a path that no
longer exists. The real path guard is unchanged and still runs before any
syscall.

## Refreshing

There is no timer. `useGitStatus` refreshes on two events and coalesces bursts
into one call within 250ms:

- a successful save (`useFileEditor`), the one moment the tree is known to have
  changed;
- the window regaining focus, which is when a rebase or a pull that happened
  elsewhere becomes worth noticing.

A workbench that polls git is a workbench that fights the terminal beside it.

## Search and `.gitignore`

`search::Collector` takes an optional `IgnoreSet` built from the ignore rows.
It is an **addition** to `SKIPPED_DIRECTORIES`, never a replacement.

Every failure - git absent, not a repository, a call that timed out - produces
an empty set, and an empty set ignores nothing. Losing search because a folder
is not a checkout would be a regression, and the shape is what makes that
impossible: `local::git::ignored` returns `Vec<String>` and not `Result`.

Wired for the local transport only. SSH search keeps the built-in skip list,
because pulling a status over the network on every query is a cost that
feature has not earned yet.

## UI

| Piece | File | Notes |
| --- | --- | --- |
| `GitStatusContext` | `features/git/context/GitStatusContext.tsx` | One reading per window; rows read it rather than being handed it |
| `useGitStatus` | `features/git/hooks/useGitStatus.ts` | The two calls, the sequence guard, the refresh policy |
| `useGitEntry` | `features/git/hooks/useGitEntry.ts` | One path's badge and ignored flag |
| `TreeRow.GitStatus` | `features/file-tree/components/TreeRowParts.tsx` | A new compound part, never a replacement for an existing one |
| `GitBranchStatus` | `features/git/components/GitBranchStatus.tsx` | Takes no props: reads context, which is what keeps the header under its prop ceiling |

Badges are letters (M, A, D, R, C, U, T, `!`) in tones named from
`theme/tokens.ts` - this feature adds no colour of its own. Each letter is
`aria-hidden` and paired with a real word, because a screen reader cannot be
expected to know what "M" means. An ignored row is dimmed exactly the way a
hidden file already is, rather than being given a tone of its own.

## What must never happen

- A caller value interpolated into a git command line. Argv only; over SSH the
  working directory is single-quoted by `ssh::command::quote`, which **refuses**
  a path containing a quote rather than escaping it.
- A path outside the connected root reaching the UI, even though git reported
  it.
- The tree, the header or search changing behaviour because a folder is not a
  repository. All three degrade to exactly what they did before this module
  existed.

## Tests

| Suite | Covers |
| --- | --- |
| `git/porcelain/tests.rs` | Recorded output: every record shape, spaces and non-ASCII in filenames, the rename pair, the entry cap |
| `git/branch.rs` tests | Unborn, detached, upstream, ahead/behind, unknown headers |
| `git/paths.rs` tests | Separator style, case folding, sibling prefixes |
| `search/ignore.rs` tests | Prefix containment, and that an empty set ignores nothing |
| `tests/git_repository.rs` | Real repositories: not one, clean, unborn, detached |
| `tests/git_status.rs` | Real repositories: every kind of change, staged-then-modified |
| `tests/git_status_guards.rs` | Rows outside the root, and search degrading with no repository |
| `test/mino-workbench/integration/git-tree-badges.test.tsx` | Badges, dimming, and the unchanged no-git rendering |
| `test/mino-workbench/integration/git-header.test.tsx` | Branch, dirty marker, ahead/behind, detached, unborn |

Every Rust suite that needs a repository **skips** when `git` is absent. A
machine without git is one this app degrades on by design, and a red suite
there would be reporting something untrue.
