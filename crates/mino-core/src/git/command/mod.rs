//! The argv every git call is made from.
//!
//! SECURITY, and the rule the whole module exists to hold: **nothing here
//! builds a shell string.** Each function returns an array whose elements are
//! passed to the process as separate arguments, so a value in one of them is
//! data and can never become syntax.
//!
//! Phase 1 could say something stronger - that no caller value appeared at all.
//! Phase 2 stages, discards and commits, so two kinds of caller value do
//! arrive, and each has its own answer:
//!
//! | Value | How it stays data |
//! | --- | --- |
//! | Paths | Guarded by [`crate::git::guard`] first, then placed after a `--` separator so a path beginning with a dash is never read as a flag |
//! | The commit message | Never in argv at all. Git reads it from **stdin** |
//!
//! The message rule is not a nicety. Over SSH the argv has to become a command
//! line, and `ssh::command::quote` refuses a value containing a single quote -
//! which would refuse every commit message with an apostrophe in it. Reading
//! it from stdin sidesteps quoting entirely, and is what makes
//! `Fix Bob's bug` a commit message rather than an error.
//!
//! The one caller-influenced value that still reaches the command line is the
//! working directory, and that is quoted (and refused when it cannot be) by
//! `ssh::command::quote`.

mod read;
mod write;

pub use read::{
    branch_argv, head_commit_argv, ignored_argv, repository_argv, status_argv, version_argv,
};
pub use write::{commit_argv, discard_argv, stage_argv, unstage_argv};

pub const GIT_PROGRAM: &str = "git";

/// Wall-clock ceiling for one git call. Long enough for a cold status on a
/// large repository, short enough that a wedged git never becomes a hang.
pub const DEFAULT_TIMEOUT_MS: u64 = 15_000;

/// Options that go *before* the subcommand, so they are git's and not the
/// subcommand's.
///
/// `--no-optional-locks` keeps a status from refreshing the index on disk.
/// Status runs whenever a file is saved or the window regains focus, and a
/// background process taking the index lock is how a workbench ends up
/// fighting a terminal the user is typing `git commit` into.
///
/// It is deliberately *not* applied to the mutating calls in [`write`]: those
/// are supposed to take the lock, because they are changing the index.
pub(super) const GLOBAL: &[&str] = &["--no-optional-locks"];

/// Separates options from paths. Everything after it is a pathspec, so a file
/// genuinely named `-f` is a file and not a flag.
pub(super) const PATH_SEPARATOR: &str = "--";
