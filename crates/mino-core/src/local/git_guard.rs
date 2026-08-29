//! Making caller paths safe, and reporting a mutating call that failed.
//!
//! Split from `git.rs` so that file stays a list of trait methods. Both
//! helpers exist so that no method can forget them - `discard` in particular
//! must never be reachable with an unguarded path.

use crate::error::{Result, TransportError};
use crate::git::{self, guard::guard_paths, paths::PathStyle};

use super::git_run::run_with_input;
use super::LocalTransport;

impl LocalTransport {
    /// The session root, and the caller's paths made safe to hand to git.
    ///
    /// One place, so no mutating method can forget it - `discard` in
    /// particular must never be reachable with an unguarded path.
    pub(super) fn guarded(&self, paths: &[String]) -> Result<(String, Vec<String>)> {
        let root = self.guard()?.root_display();
        let guarded = guard_paths(&root, paths, PathStyle::local())?;
        Ok((root, guarded))
    }

    /// The same for the reads, where a path is optional: `None` means the
    /// whole tree and is not something to guard.
    pub(super) fn guarded_one(&self, path: Option<&str>) -> Result<(String, Option<String>)> {
        let root = self.guard()?.root_display();
        let guarded = match path {
            Some(path) => Some(
                guard_paths(
                    &root,
                    std::slice::from_ref(&path.to_string()),
                    PathStyle::local(),
                )?
                .remove(0),
            ),
            None => None,
        };
        Ok((root, guarded))
    }
}

/// Runs a mutating call and turns a non-zero exit into git's own sentence.
pub(super) async fn expect_success(root: &str, argv: Vec<String>, what: &str) -> Result<()> {
    let output = run_with_input(root, &argv, None).await?;
    if output.succeeded() {
        return Ok(());
    }
    // Never reported as a partial success: the batch either ran or it did not,
    // and saying otherwise would leave the UI unable to describe the index.
    Err(TransportError::shell(git::message_or(&output, what)))
}
