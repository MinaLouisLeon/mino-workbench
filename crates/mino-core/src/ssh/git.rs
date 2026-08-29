//! `impl GitTransport for SshTransport`.
//!
//! The same three steps the local transport takes - resolve the root, run one
//! call, hand the output to [`crate::git`] - over the exec channel instead of
//! `tokio::process`. Nothing here parses anything, which is the whole point of
//! the shared module: local and remote read one parser.
//!
//! Remote paths are POSIX regardless of what this client runs on, so the
//! [`PathStyle`] is fixed rather than probed.

use async_trait::async_trait;

use crate::error::{Result, TransportError};
use crate::git::{self, command, guard::guard_paths, paths::PathStyle};
use crate::transport::GitTransport;
use crate::types::{CommitRequest, GitCommit, GitRepository, GitStatus};

use super::git_run::{run, run_with_input};
use super::handler::ClientHandler;
use super::SshTransport;

use russh::client::Handle;

#[async_trait]
impl GitTransport for SshTransport {
    async fn repository(&self) -> Result<Option<GitRepository>> {
        let connected = self.connected().await?;
        let root = connected.root.root().to_string();
        let Some(repository_root) = toplevel(&connected.handle, &root).await? else {
            return Ok(None);
        };
        let output = run(&connected.handle, &root, &command::branch_argv()).await?;
        let status = git::status_from(&output, repository_root, &root, PathStyle::posix())?;
        Ok(Some(status.repository))
    }

    async fn status(&self) -> Result<GitStatus> {
        let connected = self.connected().await?;
        let root = connected.root.root().to_string();
        let repository_root = toplevel(&connected.handle, &root)
            .await?
            .ok_or_else(git::not_a_repository)?;
        let output = run(&connected.handle, &root, &command::status_argv()).await?;
        git::status_from(&output, repository_root, &root, PathStyle::posix())
    }

    async fn stage(&self, paths: &[String]) -> Result<()> {
        let connected = self.connected().await?;
        let root = connected.root.root().to_string();
        let guarded = guard_paths(&root, paths, PathStyle::posix())?;
        expect_success(
            &connected.handle,
            &root,
            command::stage_argv(&guarded),
            "stage",
        )
        .await
    }

    async fn unstage(&self, paths: &[String]) -> Result<()> {
        let connected = self.connected().await?;
        let root = connected.root.root().to_string();
        let guarded = guard_paths(&root, paths, PathStyle::posix())?;
        expect_success(
            &connected.handle,
            &root,
            command::unstage_argv(&guarded),
            "unstage",
        )
        .await
    }

    async fn discard(&self, paths: &[String]) -> Result<()> {
        let connected = self.connected().await?;
        let root = connected.root.root().to_string();
        let guarded = guard_paths(&root, paths, PathStyle::posix())?;
        expect_success(
            &connected.handle,
            &root,
            command::discard_argv(&guarded),
            "discard",
        )
        .await
    }

    async fn commit(&self, request: CommitRequest) -> Result<GitCommit> {
        git::commit::validate(&request)?;
        let connected = self.connected().await?;
        let root = connected.root.root().to_string();

        let output = run_with_input(
            &connected.handle,
            &root,
            &command::commit_argv(&request),
            Some(request.trimmed()),
        )
        .await?;
        if !output.succeeded() {
            return Err(git::commit::failure(&output));
        }
        let described = run(&connected.handle, &root, &command::head_commit_argv()).await?;
        git::commit::parse(&described)
    }
}

/// Runs a mutating call and turns a non-zero exit into git's own sentence.
async fn expect_success(
    handle: &Handle<ClientHandler>,
    root: &str,
    argv: Vec<String>,
    what: &str,
) -> Result<()> {
    let output = run_with_input(handle, root, &argv, None).await?;
    if output.succeeded() {
        return Ok(());
    }
    Err(TransportError::shell(git::message_or(&output, what)))
}

async fn toplevel(
    handle: &russh::client::Handle<super::handler::ClientHandler>,
    root: &str,
) -> Result<Option<String>> {
    let output = run(handle, root, &command::repository_argv()).await?;
    Ok(git::repository_root(&output)?.map(|found| PathStyle::posix().normalise(&found)))
}
