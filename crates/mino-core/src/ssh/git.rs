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

use crate::error::Result;
use crate::git::{self, command, paths::PathStyle};
use crate::transport::GitTransport;
use crate::types::{GitRepository, GitStatus};

use super::git_run::run;
use super::SshTransport;

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
}

async fn toplevel(
    handle: &russh::client::Handle<super::handler::ClientHandler>,
    root: &str,
) -> Result<Option<String>> {
    let output = run(handle, root, &command::repository_argv()).await?;
    Ok(git::repository_root(&output)?.map(|found| PathStyle::posix().normalise(&found)))
}
