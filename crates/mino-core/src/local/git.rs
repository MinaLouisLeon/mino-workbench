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
use crate::git::{self, command, guard::guard_paths, paths::PathStyle};
use crate::transport::GitTransport;
use crate::types::{CommitRequest, GitCommit, GitRepository, GitStatus};

use super::git_run::{run, run_with_input};
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

    async fn stage(&self, paths: &[String]) -> Result<()> {
        let (root, guarded) = self.guarded(paths)?;
        expect_success(&root, command::stage_argv(&guarded), "stage").await
    }

    async fn unstage(&self, paths: &[String]) -> Result<()> {
        let (root, guarded) = self.guarded(paths)?;
        expect_success(&root, command::unstage_argv(&guarded), "unstage").await
    }

    async fn discard(&self, paths: &[String]) -> Result<()> {
        let (root, guarded) = self.guarded(paths)?;
        expect_success(&root, command::discard_argv(&guarded), "discard").await
    }

    async fn commit(&self, request: CommitRequest) -> Result<GitCommit> {
        git::commit::validate(&request)?;
        let root = self.guard()?.root_display();

        let output = run_with_input(
            &root,
            &command::commit_argv(&request),
            Some(request.trimmed()),
        )
        .await?;
        if !output.succeeded() {
            return Err(git::commit::failure(&output));
        }
        // Asked separately rather than scraped out of `git commit`'s own
        // human-readable output, which changes between versions.
        git::commit::parse(&run(&root, &command::head_commit_argv()).await?)
    }
}

impl LocalTransport {
    /// The session root, and the caller's paths made safe to hand to git.
    ///
    /// One place, so no mutating method can forget it - `discard` in
    /// particular must never be reachable with an unguarded path.
    fn guarded(&self, paths: &[String]) -> Result<(String, Vec<String>)> {
        let root = self.guard()?.root_display();
        let guarded = guard_paths(&root, paths, PathStyle::local())?;
        Ok((root, guarded))
    }
}

/// Runs a mutating call and turns a non-zero exit into git's own sentence.
async fn expect_success(root: &str, argv: Vec<String>, what: &str) -> Result<()> {
    let output = run_with_input(root, &argv, None).await?;
    if output.succeeded() {
        return Ok(());
    }
    // Never reported as a partial success: the batch either ran or it did not,
    // and saying otherwise would leave the UI unable to describe the index.
    Err(crate::error::TransportError::shell(git::message_or(
        &output, what,
    )))
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
