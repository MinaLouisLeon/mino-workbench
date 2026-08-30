# Remote and conflict module

> Phase 6 of six. The three hardest features, deliberately last: fetch, pull
> and push (#7), conflict resolution (#13), and review comments in the editor
> (#17). Review comments extend the [GitHub module](github-module.md); the
> other two extend [git](git-module.md).

## The credential position, first

`plan/decisions.md` **D3** asked how this application authenticates to a
remote. The answer taken is that **it does not**.

Git uses its own credential helper, the SSH agent, or the OS keychain. This
process never sees a secret, so the standing rule - no credential, token or
passphrase written to disk, to a log, or to browser storage - is kept without
qualification rather than with a carve-out. It is the same position phase 5
took with `gh`, which means the app has one answer to "where do credentials
live" instead of two.

Two things follow, and they shape every call in the module.

**Nothing can be asked a question.** A prompt with nowhere to go is a hang, so
every remote call runs with `GIT_TERMINAL_PROMPT=0` and under a two-minute
ceiling. On a machine with no helper configured, a push fails in a second or
two with a sentence naming what to set up. A *graphical* helper - Git
Credential Manager, an OS keychain dialog - is deliberately still allowed to
appear: that is what delegation is. What is prevented is the invisible prompt
on a terminal that is not there.

**No text from these calls is repeated raw.** A remote URL can carry a token -
`https://user:ghp_…@github.com/o/r` is an ordinary thing to find in somebody's
`.git/config` - and git prints remote URLs unprompted, in progress lines and in
errors. So every string that reaches a result or an error goes through
`crates/mino-core/src/git/redact.rs` first. Not when it looks suspicious;
always.

Redaction works on **structure**, not on shape. The userinfo field of a URL is
where a credential is allowed to live, so that field is removed wherever it
appears. A regex for "things that look like tokens" is a guess that fails open,
and the one format it has not been taught is the one that leaks.

One nuance is worth knowing: `git@github.com` is *not* masked. A userinfo with
no password half, over SSH, is the conventional login - masking it would make
every ordinary SSH remote unreadable for no gain. Over HTTP(S) any userinfo is
masked, because a bare `https://<token>@host` is exactly how a personal access
token is written into a remote.

`crates/mino-core/tests/git_redact.rs` asserts the outward surface rather than
the function: it walks every string a remote call can produce and checks that
no secret survives any path.

Over SSH the same position holds at a distance. The git that runs is the
**remote host's**, authenticated by that machine's helper and agent. Nothing
about this machine's configuration is involved and no secret crosses the
connection, because there is none at this end to cross it.

## The three calls, ordered by what they can lose

| Method | Can lose | What holds it |
| --- | --- | --- |
| `remotes` | Nothing. It reads config | – |
| `fetch` | Nothing in the working tree | – |
| `pull` | Uncommitted work | **Refused outright** when the tree is dirty |
| `push` | Nothing local; with `force`, commits **on the remote** | `--force-with-lease`, and a separate confirmation |

### Pull refuses rather than stashing

A pull over a dirty tree can lose work, and the tempting fix - stashing on the
reader's behalf - is worse than the problem. A stash somebody did not make is a
stash they will not think to look for. So the tree is read first and a dirty
one is refused, with a sentence naming the two things the reader can do and
pointing at the Stash section that does one of them.

### Pull reports which of five things happened

Not a boolean. `alreadyUpToDate`, `fastForwarded`, `merged`, `rebased` and
`conflicted` are five different situations with five different next moves, and
collapsing them would put the reader back to comparing two lists to work out
which one they are in.

`conflicted` is a **state, not a failure**. A pull that hits a conflict exits
non-zero, so the tree decides before the exit code does: the transport reads
`conflicts()` and, if there are any, reports the outcome rather than an error.
The merge stopped, the files are where it left them, and settling them is the
next section's job.

### Push: three things hold the force

`--force` overwrites the remote branch whatever is on it, including a
colleague's commit pushed thirty seconds ago. `--force-with-lease` refuses
unless the remote is where this repository last looked. Only the second is ever
sent, and the bare form appears nowhere in the crate - there is a test that says
so.

Beyond that:

- **A force push is a separate action**, with its own control and its own
  confirmation. It is never a fallback.
- **A rejected push offers nothing.** The error names fetching as the fix, and
  the force control stays exactly where it was. The moment somebody has been
  told the remote has commits they do not have is the worst possible moment to
  offer to delete those commits.
- The confirmation says **what will be gone and whose it might be**, not "are
  you sure?" - and says what git will still refuse, because a reader who knows
  about the lease can act more confidently.

## Conflicts

Two methods, and deliberately no third: there is no three-way merge editor
here and none planned. What is offered instead is the three things that settle
most conflicts without one - take mine, take theirs, or **edit the file and say
you are done** - which is exactly what somebody does in a terminal with
`git checkout --ours` and `git add`.

`Manual` is the one that makes the other two optional. A conflicted file is
already open-able in the viewer, markers and all, and the editor already saves
through the transport. Open it, fix it, mark it settled.

### Why a conflict is its own type

`GitFileState::Conflicted` is enough for a badge in the tree - phase 1 collapsed
all seven shapes into it on purpose - and it is **not** enough for a control.
"Take the incoming version" keeps a file when both sides changed it, and removes
one when the other side deleted it. A reader about to press that button has to
be told which they are looking at, so `GitConflict` carries the kind and the row
spells it out.

The controls are named for **which version survives**, not for git's words.
"Ours" and "theirs" are a translation step every reader performs at least once,
and translating them wrong throws away the wrong side.

### Resolving is two calls

| Resolution | What runs |
| --- | --- |
| `Ours` / `Theirs` | `git checkout --ours\|--theirs -- <path>`, then `git add -- <path>` |
| `Manual` | `git add -- <path>` alone |

The checkout writes one side over the file; the add marks the path settled.
Doing only the first leaves a file that looks resolved and a commit that still
refuses. Doing only the second stages the conflict markers, which is how
`<<<<<<<` reaches a release.

A sequence that stops halfway leaves the path unmerged, which is the honest
state and the one the next `conflicts()` reports.

### Commit is blocked, and says why

Git refuses to commit while any path is unmerged. The panel refuses earlier and
more clearly: the commit box reads the conflict count off the status it already
holds and says "settle the conflicts above before committing" - rather than
"stage something", which is what it would otherwise say and which would send the
reader entirely the wrong way.

The conflict section is neither collapsible nor read on demand, unlike every
other section in the panel. Both differences are the same decision: a conflict
blocks the commit box, so a reader who had not opened the section would be left
with a disabled button and no explanation. It renders nothing at all when
nothing is conflicted, which is almost always, and costs no call - a clean
status has no conflicted entry to ask about.

## Review comments (#17)

Extends `GitHubQuery` with two variants rather than adding a trait, which is
the whole point of the enumerated query phase 5 chose.

### The hard part: a comment is anchored to a diff, not to a file

A review comment is attached to a **position in a diff**. When the pull request
gains commits, that diff stops being the current one, and GitHub reports the
comment with a null line. The comment is still real and still worth reading;
what it no longer is, is *placeable*.

So a thread with no line is reported `outdated: true`, is **never drawn in the
gutter**, and is listed in the panel with a sentence saying what outdated means.
Falling back to `original_line` would pin somebody's objection to whatever now
happens to sit at that number - and a reader would act on it.

There is a second, quieter version of the same problem with no fix available
here, and it is worth stating: **even a current thread's line is a line in the
pull request's head commit**, and the editor is showing the working tree. If
they have drifted, the marker is off by however much. The gutter is therefore a
*pointer* - "there is a conversation about roughly here" - and every thread
carries its own path and its own link.

The path match is a suffix on a separator boundary, because GitHub does not
know where the checkout lives and this app does not know where the repository
root sits relative to the session root. The boundary check is what stops
`main.rs` matching `domain.rs`.

### Read-only, plus replies

The plan's own limit, and a deliberate one. A new top-level review comment has
to name a commit and a diff position, and getting either wrong puts an
objection against the wrong line for everybody who reads it afterwards. A reply
needs only the thread the reader is already looking at.

A reply is the second query that writes. Its body travels to `gh` as **JSON on
stdin**, so a reply containing a quote or a newline is a reply. It answers by
**re-reading the thread** rather than appending the new comment to a list the UI
already held - the same judgement `create_branch` makes about the branch it just
made.

Nothing appears in the editor unless the reader picks a pull request to review,
which is an explicit control on a pull request row.

### `gh api`, and how it is narrowed

Line-anchored review comments are on no `--json` field `gh pr view` offers, so
these two calls go through `gh api` - a wider door than the rest of the GitHub
module opens. Three things narrow it:

- **The path is fixed program text**, with `{owner}` and `{repo}` placeholders
  `gh` substitutes from the checkout. These calls cannot be pointed at another
  repository, not by a caller and not by anything a previous call returned.
- **The only caller values are numbers** - a pull request number and a comment
  id, both formatted from integers.
- **The body is on stdin**, built by `serde_json`.

## Layout

```
crates/mino-core/src/git/
  redact.rs            userinfo out of every URL, before anything sees it
  remote.rs            git remote -v, and what a pull and a push did
  remote/name.rs       the one caller value that is not a number
  remote/failure.rs    why a remote call was refused, as a sentence
  conflicts.rs         the `u` records of a status, kept whole
  command/remote.rs    argv for the three network calls, and NO_PROMPT
  command/conflict.rs  argv for listing and settling
crates/mino-core/src/github/
  command/review.rs    the two `gh api` calls
  parse/review.rs      comments into threads, and the outdated rule
```

| Transport | How | File |
| --- | --- | --- |
| Local | `tokio::process` with `NO_PROMPT` | `local/git_remote.rs`, `local/git_conflicts.rs` |
| SSH | The exec channel, environment set on the command line | `ssh/git_remote.rs`, `ssh/git_conflicts.rs` |
| Remote agent | `Unimplemented` | `stub_git_remote.rs` |

## Manual QA

The scenarios are in [manual-testing.md](manual-testing.md) §20. The setups
worth preparing are a **local bare repository** used as a remote (which is what
the Rust tests use - no network, no credential, no third-party service), a
**second clone** to make the remote move, and a **real merge conflict** made by
merging two branches that changed the same line.

The one that needs a machine rather than a fixture is **no credential helper**:
unset it, and check that a push fails in a second or two with a sentence rather
than hanging.

## Out of scope

No merge or rebase driving beyond what pull performs. No three-way merge
editor. No submitting a review verdict. No conflict resolution for binary files
beyond take-ours or take-theirs. No new top-level review comments.
