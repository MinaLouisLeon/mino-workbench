//! The git half of a session.
//!
//! A second trait rather than more methods on [`super::Transport`], reached
//! through [`super::Transport::git`]. See `plan/decisions.md` D2 and the
//! amendment in `CLAUDE.md`.
//!
//! Every implementation shells out to the `git` binary with an argv array,
//! because this app has two real targets and that is the only shape that
//! serves both with one implementation - the remote host's own git answers
//! over SSH with no extra machinery. See `plan/decisions.md` D1, and
//! [`crate::git::command`] for the rules that keep caller values out of a
//! command line.
//!
//! ## The two halves
//!
//! The read methods answer questions and cannot lose anything. The four
//! mutating ones change the repository, and share one contract:
//!
//! - **Every path is guarded first.** [`crate::git::guard`] rules on each one
//!   against the *session* root before it can reach argv, on both transports.
//!   A batch containing one refused path runs for none of them.
//! - **An empty slice means everything.** That is what the group-level
//!   controls in the source control panel send, and it is why the slice is
//!   never treated as "nothing to do".
//! - **They refresh nothing.** Each returns when git has finished; re-reading
//!   [`GitTransport::status`] is the caller's decision, made once after the
//!   action rather than on a timer.

use async_trait::async_trait;

use crate::error::Result;
use crate::types::{CommitRequest, GitCommit, GitRepository, GitStatus};

#[async_trait]
pub trait GitTransport: Send + Sync + 'static {
    /// The repository containing the connected root, or `None` when the root
    /// is not inside one. Absence is not an error: most folders are not
    /// repositories, and the UI renders that as a quiet state.
    ///
    /// Git being *absent from the target* is an error, and this is where the
    /// UI learns it - one call, one sentence, and every git surface stays
    /// quiet for the rest of the session.
    async fn repository(&self) -> Result<Option<GitRepository>>;

    /// The working tree as git sees it, for the whole repository.
    ///
    /// One call, not one per file: `git status --porcelain=v2 -z` answers for
    /// the entire tree in a single pass, and the tree needs every row at once
    /// to decorate itself. Rows for paths outside the connected root are
    /// dropped before returning, even though git reported them.
    async fn status(&self) -> Result<GitStatus>;

    /// Stage paths. An empty slice stages everything, which is what the
    /// group-level control sends.
    async fn stage(&self, paths: &[String]) -> Result<()>;

    /// Remove paths from the index, leaving the working tree alone.
    ///
    /// Nothing here can lose work: the file on disk is untouched, and the
    /// content that leaves the index is still in the file.
    async fn unstage(&self, paths: &[String]) -> Result<()>;

    /// Throw away working-tree changes.
    ///
    /// **The one call on this interface that destroys data.** What it undoes
    /// exists nowhere else - no commit, no stash, no reflog entry - so the UI
    /// confirms before calling it, names what will be lost, and never styles
    /// it as the primary action. See the discard rule in
    /// `docs/mino-workbench/git-module.md`.
    ///
    /// It restores tracked files and does **not** delete untracked ones. A
    /// file git has never seen cannot be recovered by any means, so removing
    /// one is not something this interface offers.
    async fn discard(&self, paths: &[String]) -> Result<()>;

    /// Commit what is staged. Returns the new commit so the UI can show it
    /// landed rather than guessing.
    ///
    /// Refuses with a typed error when there is nothing staged, rather than
    /// succeeding silently and leaving the user to wonder what happened. The
    /// message travels on stdin and never through argv - see
    /// [`crate::types::CommitRequest`].
    async fn commit(&self, request: CommitRequest) -> Result<GitCommit>;
}
