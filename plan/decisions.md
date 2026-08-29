# Decisions

Three of them. **D1 and D2 gate phase 1** and should be answered before a line
is written, because both are expensive to reverse once nineteen features lean
on them. D3 is not needed until phase 6 and is recorded here so it does not
arrive as a surprise.

Status of all three: **open**. They are the author's to make, not the
implementer's.

---

## D1 - What actually talks to git

Every option below keeps the architectural rule intact: the work happens
inside `mino-core`, and no component or Tauri command spawns anything.

### Option A - shell out to the `git` binary (recommended)

Run `git` with an **argv array**, never a command line. Locally that is
`tokio::process::Command`, which is already how `local/structured.rs` runs
`nu`. Over SSH the arguments have to be quoted into the remote command line -
see the risk below.

**Pros**
- One implementation shape serves local and SSH. The SSH transport already has
  an exec channel (`ssh/command.rs`), so a remote repository works with no
  extra machinery, and works on the remote's own git.
- Complete. Every one of the nineteen features is a `git` subcommand that
  exists today, including the phase 6 ones no Rust library fully covers.
- Stable, parseable output on request: `--porcelain=v2`, `-z`, `--numstat`,
  `--format=%H%x00%an`. These are documented, versioned interfaces, not
  scraped human text.
- No new crate, and nothing to build. That matters on this project's
  `windows-gnu` toolchain, which already has three documented sharp edges.

**Cons**
- Requires `git` on the target. Mitigated the way `nu` already is: probe once,
  and if it is absent say so in a sentence the user can act on rather than
  failing obscurely.
- Process spawn per call, a few milliseconds. Irrelevant next to a `status`
  the user triggered; worth caching if a future feature polls.
- **The SSH quoting risk.** `ssh/command.rs::quote` refuses any value
  containing a single quote rather than escaping it. A filename with a quote
  in it would be refused rather than handled. Acceptable and already the
  precedent, but it must be a typed error with a clear message, not a panic.

### Option B - `git2` (libgit2 bindings)

**Pros**
- A real API. No output parsing, typed errors, no `git` needed on the machine.
- Mature and complete for status, diff, log, blame, index and commit.

**Cons**
- **A C dependency.** This repo documents that `windows-gnu` already fails on
  `dlltool`, on paths containing spaces, and on export counts. Adding libgit2
  to that toolchain is asking for a fourth entry in that table.
- Does nothing for the SSH transport, which has no local repository to open.
  SSH would still need option A - so this is *both* implementations, not one.
- Its own vendored OpenSSL/libssh2 story for anything touching a remote.

### Option C - `gix` (gitoxide, pure Rust)

**Pros**
- Pure Rust, no C, no build surprises. The best fit for the `windows-gnu`
  toolchain of the three.
- Fast, and a pleasant typed API for the read paths.

**Cons**
- Coverage is uneven and moving. Status, log and diff are solid; some
  mutating operations are still maturing. Phase 6 in particular is not fully
  served today.
- Same SSH problem as option B: no local repository to open, so the remote
  transport needs option A anyway.
- A moving target to pin and follow.

### Recommendation

**Option A.** The deciding argument is not performance, it is that this app
has two real transports and only option A serves both with one implementation.
Options B and C would mean maintaining a library path *and* a shell-out path,
which is two behaviours to keep in agreement - the exact trap
`mino_core::search` was designed to avoid by putting the decisions in one
shared place.

If option A is chosen, phase 1 must also add: a `git` probe alongside the
existing `nu` probe, a `GitError` mapping git's exit codes to typed errors,
and a rule written into the module doc that **no caller value is ever
interpolated into a git command line** - argv only, exactly as
`StructuredRequest` binds parameters rather than splicing them.

---

## D2 - Where the git methods live on the transport

`Transport` has thirteen methods today. All nineteen features need roughly
twenty-five more.

### Option A - add them to `Transport`

**Pros** Nothing changes conceptually; `CLAUDE.md` stays true as written.

**Cons** A 38-method trait. `stub.rs` has to answer every one of them for the
remote agent, and the macro that does it grows to match. Every implementation
file grows past the 150-line ceiling and has to be split for reasons that have
nothing to do with cohesion.

### Option B - a separate `GitTransport` trait (recommended)

`Transport` keeps its thirteen methods. Git gets its own trait, its own stub
macro, its own Tauri command module and its own TypeScript client, reached
from the existing one:

```rust
pub trait Transport: Send + Sync + 'static {
    // ... the thirteen that exist now
    /// The git surface for this session, or `None` where the target has no
    /// git - not an error, an absence the UI renders as "not a repository".
    fn git(&self) -> Option<&dyn GitTransport>;
}
```

**Pros**
- Both traits stay small enough to read. Git's stub is separate from the
  filesystem stub.
- "Is there git here?" becomes a type-level question answered once, instead of
  twenty-five methods each returning a not-a-repository error.
- The TypeScript side mirrors it as `client.git`, which reads well at the call
  site and keeps `TransportClient` from becoming a wall.

**Cons**
- `CLAUDE.md` says the transport is *one* interface. This makes it two, and
  that document needs amending in the same PR - the rule should describe the
  code, not be quietly contradicted by it.
- One more layer to thread through the Tauri commands.

### Option C - one method, an enum command

`git(GitRequest) -> GitResponse` with a tagged union.

**Pros** The trait grows by one.
**Cons** Abandons the one-method-per-method mirror that makes the TypeScript
client checkable against the Rust trait, and turns every call site into a
match on a response enum. Rejected unless the author prefers it.

### Recommendation

**Option B**, with the `CLAUDE.md` amendment written in the same PR that
introduces it.

---

## D3 - Credentials for push and pull (phase 6 only)

Recorded now, decided later. The rule today is absolute: no credential,
private key or passphrase is written to disk, to a log, or to browser storage.
Push and pull need to authenticate to a remote, so phase 6 cannot begin until
this is answered.

| Option | What it means | Cost |
| --- | --- | --- |
| **Delegate to the system** | Let git use its own credential helper, the SSH agent, or the OS keychain. The app never sees a secret. | Least new risk. Fails where none is configured, and cannot prompt. |
| **Prompt per operation, hold in memory** | Ask when needed, keep it for the session only, never persist. | Honest but easy to get subtly wrong; needs care that it never reaches a log or an error message. |
| **Read-only remotes** | Ship fetch and status only. Never push. | No credential problem at all. Phase 6 loses its headline feature. |

Recommendation deferred. The system-delegation option is the one that keeps
the standing rule intact without qualification, and is where this should
start.
