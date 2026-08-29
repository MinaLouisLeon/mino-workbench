//! `impl GitTransport for LocalTransport`.
//!
//! Dispatch only, in the same spirit as `transport_impl.rs`: resolve the
//! guard, run one git call, hand the output to [`crate::git`] to interpret.
//! Nothing here parses anything.
//!
//! Every call runs with the *session* root as its working directory, not the
//! repository root. Git walks up to find the repository itself, and starting
//! anywhere else would mean choosing a directory the path guard has not
//! already approved.

use async_trait::async_trait;

use crate::error::Result;
use crate::git::{self, command, paths::PathStyle};
use crate::transport::GitTransport;
use crate::types::{GitRepository, GitStatus};

use super::git_run::run;
use super::LocalTransport;

#[async_trait]
impl GitTransport for LocalTransport {
    async fn repository(&self) -> Result<Option<GitRepository>> {
        let root = self.guard()?.root_display();
        let Some(repository_root) = toplevel(&root).await? else {
            return Ok(None);
        };
        // The branch, head and counts all live in the status headers, so the
        // repository is read from a real status rather than from a `git
        // branch` that could disagree with the one the tree reads. This is the
        // header-only form: nothing here needs the file rows, and the
        // untracked walk is the expensive half.
        let output = run(&root, &command::branch_argv()).await?;
        let status = git::status_from(&output, repository_root, &root, PathStyle::local())?;
        Ok(Some(status.repository))
    }

    async fn status(&self) -> Result<GitStatus> {
        let root = self.guard()?.root_display();
        let repository_root = toplevel(&root).await?.ok_or_else(git::not_a_repository)?;
        let output = run(&root, &command::status_argv()).await?;
        git::status_from(&output, repository_root, &root, PathStyle::local())
    }
}

/// The work tree root containing `root`, or `None` when there is not one.
async fn toplevel(root: &str) -> Result<Option<String>> {
    let output = run(root, &command::repository_argv()).await?;
    // `--show-toplevel` answers in forward slashes even on Windows. Putting
    // it back into the platform's own style is what lets the entry paths
    // compare against `DirEntry::path` without special cases downstream.
    Ok(git::repository_root(&output)?.map(|found| PathStyle::local().normalise(&found)))
}

/// The repository-relative paths git would not look at, for the search walk.
///
/// Not on the trait: search asks for this on its own behalf, and a failure -
/// git absent, not a repository, a call that timed out - is answered with an
/// empty list rather than an error. Losing search entirely because a folder
/// is not a repository would be a regression, so this degrades instead.
pub async fn ignored(root: &str) -> Vec<String> {
    match run(root, &command::ignored_argv()).await {
        Ok(output) => git::ignored_from(&output),
        Err(err) => {
            tracing::debug!(%err, "git could not answer for ignored paths; searching everything");
            Vec::new()
        }
    }
}
