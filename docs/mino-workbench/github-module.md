# GitHub module

> Phase 5 of six. The parts of GitHub you check while working: CI status, pull
> requests, issues, creating a pull request, and opening a file on the web. No
> merging, no review comments - see `plan/` for what lands when.

## The credential position, first

**This application never holds a GitHub token.** Not on disk, not in a log, not
in browser storage, and not in memory for the length of one call. The standing
rule is honoured here by there being nothing to keep.

Every request shells out to the **`gh` CLI**, which owns its own
authentication and stores it in the operating system's keychain under its own
name. `mino-core` runs `gh`, reads its JSON, and forgets it.

Three consequences follow, and they are the shape of the module rather than
apologies for it:

| Consequence | What the app does |
| --- | --- |
| `gh` must be installed | Says so in one sentence naming `cli.github.com`, then goes quiet |
| `gh` must be signed in | Says so, and names `gh auth login`. It cannot offer to do it |
| Only GitHub remotes are served | A GitLab or Bitbucket remote is a quiet absence, not an error |

The app cannot log anybody in, and that is the correct division of
responsibility rather than a gap: the handshake is interactive, it opens a
browser, and the credential belongs to `gh`'s keychain entry. A workbench
standing in the middle of that would be a workbench holding a token.

Over SSH the same position holds at a distance. The `gh` that runs is the
**remote host's**, signed in as the remote account, with its credential in that
machine's keychain. Nothing about this machine's GitHub login is involved and
no token crosses the connection - there is none here to cross it.

## `gh` output is untrusted input

Titles, branch names, labels and bodies were written by whoever opened the pull
request or filed the issue, which on a public repository is anybody at all.
They are:

- **rendered as text, never as markup.** Every row goes into a text node;
  nothing in `features/github` sets HTML, and a pull request body is shown in a
  `whitespace-pre-wrap` block rather than through a Markdown renderer;
- **never interpolated into a command.** Nothing that came back from `gh` is
  ever sent to `gh`. The only values that travel outward are ones the reader
  typed or the app chose;
- **never used to decide what to call next.** A run's id is a number and a
  pull request's number is a number, which is the strongest form the rule
  takes.

This is the same discipline the transport already applies to filenames. The
only thing that changes is how much further away the author is.

## The two methods

A **third** trait, `mino_core::transport::GitHubTransport`, reached from the
first through `Transport::github() -> Option<&dyn GitHubTransport>` and
mirrored in TypeScript as `client.github`. The argument for a separate trait is
the one `plan/decisions.md` D2 makes about git, inherited rather than re-made.

What is different is the **size**. Git needs twenty-five methods and has them.
GitHub needs two, because five features share one enumerated query:

```rust
pub trait GitHubTransport {
    async fn probe(&self) -> Result<GitHubProbe>;
    async fn query(&self, request: GitHubQuery) -> Result<GitHubResponse>;
}
```

That is a trade, and it costs something: a caller matches on a response variant
instead of being handed the type it asked for. `features/github/query.ts` pays
that once, so no section writes a `switch` over seven variants. What it buys is
a surface that does not grow by three files - a trait method, a Tauri command,
a client method - every time somebody wants another list.

### `probe` has four answers, and they are four different facts

| Answer | Means | What the view does |
| --- | --- | --- |
| `absent` | `gh` is not installed | One sentence naming `cli.github.com` |
| `unauthenticated` | `gh` has no credentials | One sentence naming `gh auth login` |
| `unsupported` | Not a repository, no remote, or not a GitHub one | One sentence, quietly |
| `ready` | A GitHub repository, reachable | The four sections |

Only the last is a reason to make any other call. **None of the first three is
an error** - they are ordinary states of an ordinary machine - and an `Err` from
`probe` means something else went wrong entirely, which is the only one the
view styles as a failure.

The order the probe asks in is what keeps them apart. `gh auth status` runs
*before* `gh repo view`, because both fail without credentials and only the
first fails **for that reason**. Collapsing them would make "run `gh auth
login`" and "this is not a GitHub repository" the same sentence, which is the
one thing a reader must not be told.

### `query` is an enum of named subcommands

```rust
pub enum GitHubQuery {
    Runs { branch, limit },              // gh run list
    RunJobs { run_id },                  // gh run view --json jobs
    PullRequests { state, limit },       // gh pr list
    PullRequest { number },              // gh pr view
    Issues { state, limit },             // gh issue list
    CreatePullRequest { title, body, base, draft },
    BrowseUrl { path, line, branch },    // gh browse --no-browser
}
```

A caller picks a *variant*; the program text lives in
`mino_core::github::command`. There is no shape of this type that lets a caller
name a subcommand, add a flag, or reach a `gh` call this crate has not written
down.

`RunJobs` is the one variant not in the original plan, and it earns its place:
`gh run list` reports a run's conclusion and never its jobs, so one call can say
"the pipeline failed" and nothing more. Naming the job that broke is the
difference between a notification and something worth acting on.

`CreatePullRequest` is the one that **writes**. It is confirmed in the UI
first, showing the title, the branch pair and the draft state, and it answers
with the URL it made rather than leaving the author to go and look.

## How caller values stay data

The rule from `git::command` again, with one addition of its own:

| Value | How it stays data |
| --- | --- |
| A branch name | `git::refname::precheck` - the same guard a checkout uses - then `--branch <name>` as its own argv element |
| A limit, a run id, a pull request number | Not text at all. A `u32`/`u64` formatted in Rust |
| A list filter | An enum. `command::state_word` is the only place those words are written |
| A file path | `git::guard` against the connected root, then after a `--` separator |
| A pull request title and base | Argv elements behind explicit `--title` and `--base` |
| A pull request **body** | Never in argv. `gh` reads it from **stdin** via `--body-file -` |

The body rule is the same one a commit message follows, for the same reason:
over SSH the argv becomes a command line, and `ssh::command::quote` refuses a
value containing a single quote. A description with an apostrophe in it must be
a description, not an error.

**The documented SSH limit.** A *title* still travels in argv, so a pull request
title containing an apostrophe is a typed error on a remote target and works
locally. That is the same limit a stash message has, and it is a limit rather
than a difference: it fails with a sentence, and rewording a title is a
reasonable thing to ask where rewording a description is not.

## No timer, anywhere

Nothing in this module polls. A query is made:

- on mount,
- on a branch change,
- when the reader presses Refresh,

and at no other time. There is no interval in `features/github`, and
`useGitHubQuery` is the single place any section may ask for anything, which is
what makes that a property of the feature rather than a rule four hooks each
have to remember.

Two reasons, and both are real. The rate limit is somebody's account budget,
spent invisibly. And a workbench that quietly makes network calls forever is a
surprise nobody consented to.

The second half of the same policy is that **a closed section makes no call**.
Issues and the new pull request form are collapsed by default and read nothing
until they are opened; checks and pull requests are open, because whether the
branch is green is the first thing worth knowing. A pull request body is read
one at a time, on selection, rather than twenty at once to show twenty titles.

There is deliberately **no focus listener** either. Coming back to the window is
a reason to re-read a working tree - `useGitStatus` does - and is not a reason
to spend an API budget.

## Layout

```
crates/mino-core/src/github/
  mod.rs             the credential position, find_gh, GhOutput, the sentences
  call.rs            one query -> one call -> one typed answer (both transports)
  command/probe.rs   argv for `gh auth status` and `gh repo view`
  command/list.rs    argv for the five reads, with their --json fields named
  command/write.rs   argv for `pr create` and `browse`
  probe.rs           the four answers, and how each is told apart
  parse/mod.rs       the JSON helpers, and the protocol error
  parse/runs.rs      run and job rows
  parse/pulls.rs     pull request rows, and the check rollup
  parse/issues.rs    issue rows
  create.rs          what the one writing call refuses, and its URL read back
  browse.rs          the path guard for a browse target
  time.rs            RFC 3339 -> epoch milliseconds, without a date crate
```

`call.rs` is what makes two transports out of one implementation. A transport's
whole job is: `plan` (every guard runs here), run it (the only part that
differs), then `read` or `failure`. Neither transport builds an argument and
neither parses one.

| Transport | How | File |
| --- | --- | --- |
| Local | `tokio::process`, cwd = the guarded root | `local/github.rs`, `local/github_run.rs` |
| SSH | The exec channel, every argument single-quoted | `ssh/github.rs`, `ssh/github_run.rs` |
| Remote agent | `Unimplemented`, via `unimplemented_github_transport!` | `stub_github.rs` |

The spawning itself is now shared. `local/child.rs` and `ssh/exec.rs` were
extracted from their git counterparts when `gh` arrived: the argv rule, the
stdin close and `kill_on_drop` are the same four things whichever binary is
running, and two copies of them would be two places to forget one.

**There is no `which` at a distance.** The local probe asks `find_gh()` before
spawning anything; over SSH the only way to learn whether the host has `gh` is
to try. Exit status 127 is a POSIX shell saying it could not find the command,
and `ssh/github_run.rs::NOT_FOUND` is where that convention is written down. It
decides between two *quiet* states and never between quiet and broken.

## Reading `gh` when it changes

`gh` can change the shape of its JSON between versions. Three things answer
that, and they answer different halves of it:

1. **Every field is named** with `--json`. A field this build needs and `gh` no
   longer has is a non-zero exit with `gh`'s own sentence; a field `gh` added
   costs nothing.
2. **A missing structure is a typed protocol error** naming what was being
   read - "while reading the issues" - and suggesting an update. Never a panic,
   and never a silently empty list, because an empty list is a fine answer that
   means something else entirely.
3. **A missing value is not an error.** A run that has not started has no
   `startedAt`; an author who deleted their account has no `login`. Those read
   as absences, because a row with one field missing is still a row worth
   showing.

`GitHubCheckState` is the same judgement applied to vocabulary. GitHub uses two
dozen words across `status`, `conclusion` and `statusCheckRollup`; this narrows
them to seven the UI can render, with `unknown` as a **state** rather than a
parse failure. A run whose conclusion this build has never heard of is still a
run worth listing.

## The UI

`apps/ui/src/features/github/`, and a `github` entry in `SIDEBAR_VIEWS` below
source control - what is happening locally comes before what is happening on a
server.

| Section | Feature | Default | Notes |
| --- | --- | --- | --- |
| Checks | #14 | **Open** | The latest run, its state, and the failing job named |
| Pull requests | #15 | Open | Author, base, check state; selecting one reads its body |
| Issues | #18 | Collapsed | Titles and label names |
| New pull request | #16 | Collapsed | Confirms before creating |

**#19 Open on github.com** is not a section. It is a command on the viewer
header, and it renders nothing at all where there is no GitHub repository, no
`gh`, or no file open - a control that is present but dead is one the reader
keeps trying.

It works in two steps, and they are two on purpose. Rust asks `gh` where the
file lives and answers with a **URL**; the UI hands that URL to the operating
system's browser through `tauri-plugin-opener`. A transport method called
`query` that launched a browser as a side effect would be a surprise, and a
page that navigated itself to an address GitHub supplied would be a page
somebody else can steer.

Two guards sit under that, at two levels. `lib/openExternal.ts` refuses
anything that is not a `https://github.com` origin, which is the check that
produces a sentence. And `capabilities/default.json` scopes
`opener:allow-open-url` to `https://github.com/*`, which is the check that
matters - it holds even if the first one is wrong.

The line is read from the editor at the moment the button is pressed, by
`useCodeMirror`'s `currentLine`. Nothing tracks the cursor before then: keeping
it in React would be a re-render per arrow key to answer a question nobody had
yet asked.

## Two decisions worth knowing

**A refresh does not blank the view.** `useGitHubProbe` drops to a loading
state only when the *folder* changes. Pressing Refresh keeps what is on screen
while it asks again, because dropping to loading would unmount every section
and lose the reader's place - the pull request they had open, the issues they
had expanded - every time they pressed the button meant to update it.

**The branch comes from `git status`, not from a second call.** Every section
is scoped to a branch, and two readings of which branch is checked out could
disagree; the workbench header is the one already showing it. `GitHubProvider`
therefore sits *inside* `GitStatusProvider`. The branch arriving late - a
moment after mount - is skipped rather than treated as a change, or every
session would start with a second round of calls asking what the first round
asked.

## Manual QA

The scenarios are in [manual-testing.md](manual-testing.md) §19, and the four
worth setting up deliberately are:

| Setup | How |
| --- | --- |
| `gh` absent | Rename or unlink `gh`, or open a session on a host without it |
| `gh` logged out | `gh auth logout`, then reopen the folder |
| A non-GitHub remote | `git remote set-url origin https://gitlab.com/o/r.git` |
| A repository with no remote at all | `git init` a fresh folder and open it |

Each must produce **its own sentence** and nothing else - no error styling, no
empty sections, and no change anywhere else in the workbench.

## Out of scope

No merging a pull request. No review comments - that is #17 in phase 6. No
issue creation or editing, no notifications, and no browsing a repository other
than the one the folder points at.
