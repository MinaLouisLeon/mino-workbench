# Git module

> Phases 1-3 of six. Reading the working tree, changing it, and reading what
> happened: status, staging, discard, commit, diff, log, show and blame. No
> branches, no stash, no network - see `plan/` for what lands when.

Three features fall out of a single `git status`: badges in the file tree, a
branch and dirty marker in the header, and a search walk that skips what
`.gitignore` skips. They share one call because git answers for the whole
repository in one pass, and because three readings of the same tree could
disagree with each other.

## The two halves

The trait is split the way the work is. Two methods read the working tree and
cannot lose anything; four change it and share one contract.

| Method | Kind | Notes |
| --- | --- | --- |
| `repository` | read | Three answers, three meanings - see below |
| `status` | read | The whole tree in one call |
| `stage` | write | An empty slice means everything |
| `unstage` | write | Cannot lose work: the files are untouched |
| `discard` | write | **The one call that destroys data** |
| `commit` | write | Message on stdin, never in argv |
| `diff` | read | Parsed into hunks, with both line numbers |
| `log` | read | Paged; an unborn branch is empty, not an error |
| `show` | read | One commit and the files it touched |
| `commit_diff` | read | What one commit did, root commits included |
| `blame` | read | Per-line authorship, on demand only |

Every mutating call guards its paths first, treats an empty slice as
"everything", and refreshes nothing - re-reading `status` is the caller's
decision, made once after the action rather than on a timer.

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
    async fn stage(&self, paths: &[String]) -> Result<()>;
    async fn unstage(&self, paths: &[String]) -> Result<()>;
    async fn discard(&self, paths: &[String]) -> Result<()>;
    async fn commit(&self, request: CommitRequest) -> Result<GitCommit>;
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
  mod.rs             the probe, GitOutput, and the error sentences
  interpret.rs       exit codes into answers; the session-root filter
  command/read.rs    argv for the calls that only read
  command/write.rs   argv for the calls that change something
  command/history.rs argv for diff, log, show and blame
  guard.rs           the path guard every path-taking call passes through
  revision.rs        the guard for the values that are not paths
  commit.rs          one commit parsed, and one refusal read
  branch.rs          the `# branch.*` headers
  porcelain.rs       the --porcelain=v2 -z record loop
  porcelain/record.rs  one status record decoded
  diff.rs            the unified-diff file loop
  diff/header.rs     what happened to a file: paths, renames, binary
  diff/hunk.rs       one @@ block, and where each line lands
  diff/path.rs       a path out of a header line, unquoted
  history.rs         log and show
  blame.rs           blame --porcelain, expanded per line
  paths.rs           PathStyle: git's forward slashes into the target's own style
```

The split mirrors `crates/mino-core/src/search/`: the per-transport code
**runs** git, and everything it **decides** is in the shared module. Local and
SSH cannot drift into disagreeing about what git said, because neither of them
reads it.

| Transport | How | File |
| --- | --- | --- |
| Local | `tokio::process::Command`, cwd = the guarded root | `local/git.rs`, `local/git_run.rs` |
| SSH | The exec channel, **every argument** single-quoted | `ssh/git.rs`, `ssh/git_run.rs` |
| Remote agent | `Unimplemented`, via `unimplemented_git_transport!` | `stub_git.rs` |

Phase 1 could join the SSH arguments raw, because all of them were flags and
subcommand names. Phase 2 passes paths, so every argument is quoted now: a path
with a space in it would otherwise arrive at the remote git as two arguments.

## The calls

All in `git/command/`, split into `read.rs` - where no function takes a caller
value at all - and `write.rs`, where paths arrive already guarded.

| Argv | Used by | Why this shape |
| --- | --- | --- |
| `rev-parse --show-toplevel` | Both | Exit 128 saying "not a git repository" is the answer, not an error |
| `status --porcelain=v2 -z --branch -uall --ignored=matching` | `status()` | The whole working tree in one pass |
| `status --porcelain=v2 -z --branch -uno --ignored=no` | `repository()` | Headers only; skips the untracked walk, which is the expensive half |
| `status --porcelain=v2 -z -unormal --ignored=matching` | Search | The ignore rows alone |
| `log -1 -z --format=...` | `commit()` | Describes the commit that just landed, instead of scraping git's own output |
| `add --all`, or `add -- <paths>` | `stage()` | `--all` and not `.`: `.` is relative to the working directory, so on a session rooted below the repository root it would quietly stage only part of the tree |
| `reset --quiet [-- <paths>]` | `unstage()` | Not `restore --staged`, which reads HEAD and fails outright on an unborn branch - exactly when someone is most likely to stage something and change their mind |
| `restore --worktree -- <paths>` | `discard()` | Restores tracked files, and only those |
| `commit --quiet --file - --cleanup=strip` | `commit()` | The message arrives on **stdin** |

The read calls are prefixed with `--no-optional-locks`, so a background status
never takes the index lock out from under a `git commit` being typed in the
terminal pane below. The write calls deliberately are not: they are changing
the index, and asking git to avoid the lock would be asking it not to do what
it was called for.

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

And every path sits behind a `--` separator, so a file genuinely named `-f` is
a file and not a flag.

## The commit message travels on stdin

`git commit --file -`, with the message written to the child's stdin. Not an
optimisation - the reason is the SSH transport.

Over SSH the argv has to become a command line, and `ssh::command::quote`
*refuses* a value containing a single quote rather than escaping it. A message
in argv would therefore refuse every commit message with an apostrophe in it:
"Fix Bob's bug" would be an error rather than a commit. On stdin it is bytes
that nothing parses.

The same path is used locally, so there is one code path rather than two, and
no argv length ceiling on a long message.

## The path guard for writes

`git/guard.rs`. Every path handed to `stage`, `unstage` or `discard` passes
through it before it can reach argv, on both transports.

It does **not** use the existing `RootGuard`, and the reason matters: that
guard canonicalises, which is a syscall, and a syscall cannot answer for a path
that is not there. Staging a *deleted* file is half of what a source control
panel is for, so a guard built on `canonicalize` would refuse the very
operation the panel exists to offer.

This one rules on the string instead, and is strict about it:

- a `..` or `.` segment is refused outright rather than resolved;
- the path must sit inside the **session** root, by the same containment test
  phase 1 filters status rows with;
- naming the root itself is refused. An empty slice is how a caller asks for
  everything; letting the root through as a path would turn a one-file discard
  into a whole-tree one;
- the result is root-relative with forward slashes, which git accepts on every
  platform and which keeps an absolute Windows path out of a remote command
  line.

A batch is **all-or-nothing**. One refused path runs none of them:
half-applying a stage and then reporting a failure would leave the index in a
state nobody asked for and the UI unable to say what happened.

## The discard rule

`discard` is the only call in this app that destroys work outright. What it
undoes exists nowhere else - no commit, no stash, no reflog entry. Six rules
guard it, and each one is a separate way the mistake gets made:

1. **It always confirms**, and the confirmation *names* what will be lost - the
   file, or the count - rather than asking "are you sure?".
2. **The confirm button says what it will do** (`Discard main.rs`), never "OK",
   so a reader who skipped the sentence still sees the consequence.
3. **Cancel is the primary-styled, auto-focused button.** Keeping your work is
   the safe default, and Enter should do the safe thing.
4. **The row control is never primary-styled**, and never the obvious thing to
   click.
5. **The editor's draft for that file is cleared with it.** Otherwise the
   viewer would go on showing - and one Ctrl+S write back - text that exists
   nowhere else. This is why `DraftStore` moved into a context both the editor
   and this panel can reach.
6. **Untracked files are never discarded.** `git restore` does not touch a file
   git has never seen, and this app does not offer to delete one either: it
   could not be recovered by any means. The panel omits the control and says
   why on hover.

In the code the rule is a shape rather than a comment: `useDiscardPrompt` has
an `ask` and a `confirm`, and the transport's discard is reached from `confirm`
alone.

## Reading history

Phase 3 adds four read-only calls, and one rule runs through all of them:
**git's formats are decoded in Rust, never in a component.**

A renderer that read a patch would be a second implementation of the unified
diff format, and with two transports eventually two disagreeing ones - the same
reason `search::fuzzy` holds the ranking and `git::porcelain` holds the status
format. So a `GitHunk` arrives with the line numbers on both sides already
worked out, and a `GitBlame` arrives expanded per line.

| Call | Argv | Parsed by |
| --- | --- | --- |
| `diff` | `diff --no-color --no-ext-diff --find-renames -U3 [--cached] [<rev>] [-- <path>]` | `git/diff/` |
| `commit_diff` | `diff-tree --no-commit-id --patch --root <rev>` | `git/diff/` |
| `log` | `log -z --format=… --max-count=N+1 [--skip=N]` | `git/history.rs` |
| `show` | `show --name-status -z --format=…` | `git/history.rs` |
| `blame` | `blame --porcelain -- <path>` | `git/blame.rs` |

### Four things the recordings taught

Each of these was found by running real git and reading the bytes, not by
reading the manual - and each would have been a wrong answer rather than a
crash.

**A path with a space arrives with a trailing tab.** `diff --git a/release
notes.md b/release notes.md` is genuinely unsplittable, so the parser reads the
`---`/`+++` lines instead, where the path runs to the end of the line and git
marks the end with a tab when it had to.

**A pure rename has no `---`/`+++` lines at all** - only `rename from` and
`rename to`. So does a binary file, and so does a mode-only change. All three
would arrive nameless, and a nameless file entry is one this parser drops, so
`diff --git`'s own pair is read as a fallback: the two halves are equal for
everything except a rename, and the split that makes them equal is the right
one.

**`<sha>^!` is wrong for a root commit.** It looks like "this commit against
its parents" and is, except that a parentless commit has none - so `^!`
degrades into `diff <sha>`, which compares the *working tree* against it and
answers nothing at all for a clean checkout. `diff-tree --root` diffs against
the empty tree, which is what the question meant.

**`--untracked-files=no` with `--ignored=matching` is refused outright** by
git, because working out what is ignored *is* the untracked walk. (Phase 1's
lesson, repeated here because the same instinct produces it again.)

### Separators

`log` and `show` use `%x1f` between fields and NUL between records. NUL because
git forbids it inside a commit object, so no message can break the split; `%x1f`
because a subject can contain a tab and a newline but has no reason to contain
a unit separator.

### Revisions are not paths

`DiffRequest::against` and the sha handed to `show` are revisions, and the path
guard cannot rule on them - none is a filesystem path and it would refuse every
one. They go through `git/revision.rs` instead, which exists for one reason:
**a revision must not be readable as an option.** `--upload-pack=…` runs a
program and `--output=…` writes a file, and both are real git options. A
leading `-` is refused outright, the allow-list is the narrow one, and the argv
builders place a revision *in front* of the `--` separator - behind it, git
would read `main` as a filename.

### Bounds

| Limit | Value | Constant |
| --- | --- | --- |
| Diff lines | 20 000 | `MAX_DIFF_LINES` |
| Log page | 50, ceiling 500 | `DEFAULT_LOG_LIMIT`, `MAX_LOG_LIMIT` |
| Blame lines | 50 000 | `MAX_BLAME_LINES` |

`log` asks git for **one more commit than the caller wanted**. That extra row is
never returned; it is how `truncated` is answered without a second call
counting the whole history.

## The viewer's modes

The viewer gains `file` and `diff`, toggled in the pane header. Two decisions
are worth knowing.

**The editor is hidden, not unmounted.** Rebuilding it on every toggle would
restore the document from the draft - correct, but it loses the cursor - and
the point of a mode toggle is that it costs nothing to look. That means the
editor element must keep **one position in the tree**: moving it between
branches of a conditional would remount it and quietly break exactly the thing
the arrangement exists for. It is also told when it becomes visible again,
because a CodeMirror laid out at zero height measures itself wrong and comes
back blank.

**Diff mode does not require the file to be readable.** A commit's diff is
worth showing for a file that was deleted afterwards, or one too large for the
editor. In both cases there is no content to read and a real change to look at.

Blame is a CodeMirror gutter rather than a column beside the editor, so it
scrolls with the document and lines up with it exactly. It is **off by
default** and read **on demand only** - it is the most expensive call on the
interface, and nothing asks for it because a file was opened. Repeated
authorship is collapsed to the line where it changes; drawing it on all thirty
lines of a block would hide the thing worth seeing.

Two colour tokens were added to `theme/tokens.ts` for the diff, deliberately
not borrowing `accent` and `danger`: an added line is not a success and a
removed one is not an error.

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
| `SourceControlPane` | `features/source-control/components/` | The third rail view: two groups, a commit box, and the discard confirmation |
| `ChangeRow` | `features/source-control/components/ChangeRow.tsx` | The third compound row, after `TreeRow` and `SearchRow` |
| `useDiscardPrompt` | `features/source-control/hooks/` | Asking and acting as two functions - the discard rule as a shape |
| `DraftsContext` | `features/viewer/context/DraftsContext.tsx` | The draft store, shared so a discard can clear the file's unsaved text |
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
- A discard reaching git without a confirmation, or reaching a path the session
  does not own.
- A commit message lost to a failed commit. The box keeps its text until the
  transport says the commit landed.

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
| `tests/git_stage.rs` | Stage and unstage against real repositories, including an unborn branch |
| `tests/git_discard.rs` | Discard restores the file it names, and moves nothing else |
| `tests/git_commit.rs` | A sha `git log` agrees with, an apostrophe in the message, amend, and nothing-staged |
| `tests/git_mutate_guards.rs` | Every mutating method refuses a path outside the root, and a batch is all-or-nothing |
| `git/guard/tests.rs` | Traversal, deleted files, and the root itself |
| `git/commit/tests.rs` | The commit line, and git's refusals read as sentences |
| `integration/source-control*.test.tsx` | Grouping, staging, the commit box, every discard rule, and the history list |
| `git/diff/**/tests.rs` | Recorded patches: renames, binaries, no-newline, spaces, the cap |
| `git/history/tests.rs`, `git/blame/tests.rs` | Recorded log, show and blame output |
| `git/revision.rs` tests | Every revision that must be refused, and every one that must not |
| `tests/git_diff*.rs`, `git_log.rs`, `git_show.rs` | The same against real repositories |
| `tests/git_history_guards.rs` | Paths outside the root, and revisions that would be read as options |
| `integration/viewer-{diff,mode,blame}.test.tsx` | Diff rendering, the draft surviving a mode switch, and the gutter |
| `test/mino-workbench/integration/git-tree-badges.test.tsx` | Badges, dimming, and the unchanged no-git rendering |
| `test/mino-workbench/integration/git-header.test.tsx` | Branch, dirty marker, ahead/behind, detached, unborn |

Every Rust suite that needs a repository **skips** when `git` is absent. A
machine without git is one this app degrades on by design, and a red suite
there would be reporting something untrue.
