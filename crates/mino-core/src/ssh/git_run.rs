//! Running `git` on the remote host.
//!
//! The awkward half of the shell-out decision, and the reason it is still the
//! right one: the remote host has its own git, so a repository over SSH works
//! with no extra machinery - but `exec` hands a *string* to the remote login
//! shell, so the argv array has to become a command line somewhere.
//!
//! It becomes one here, under two rules:
//!
//! - every argument comes from [`crate::git::command`] and is fixed program
//!   text, so there is no caller value to inject with;
//! - the working directory is the one caller-influenced value, and it goes
//!   through [`super::command::quote`], which *refuses* a path containing a
//!   single quote rather than escaping it. A remote path with a quote in it is
//!   reported as a typed error, exactly as `run_structured` already does.

use russh::client::Handle;
use russh::ChannelMsg;

use crate::error::{Result, TransportError};
use crate::git::{command::GIT_PROGRAM, GitOutput};

use super::command::quote;
use super::handler::ClientHandler;

/// Ceiling for one remote git call. Longer than the local one: the same status
/// is running over a network round trip.
const TIMEOUT_MS: u64 = 20_000;

pub async fn run(handle: &Handle<ClientHandler>, cwd: &str, argv: &[&str]) -> Result<GitOutput> {
    let line = command_line(cwd, argv)?;
    tokio::time::timeout(
        std::time::Duration::from_millis(TIMEOUT_MS),
        exchange(handle, line),
    )
    .await
    .map_err(|_| TransportError::Timeout {
        operation: "git".to_string(),
        ms: TIMEOUT_MS,
    })?
}

/// `cd '<cwd>' && git <fixed args>`.
///
/// The arguments are not quoted because none of them can need it - they are
/// the constants in `git::command`, all of them flags and subcommand names.
/// The assertion below is what keeps that true if someone later adds one that
/// is not.
fn command_line(cwd: &str, argv: &[&str]) -> Result<String> {
    if argv.iter().any(|arg| arg.contains([' ', '\'', '"', '$'])) {
        return Err(TransportError::invalid(
            "a git argument that needs quoting reached the remote command line",
        ));
    }
    Ok(format!(
        "cd {} && {GIT_PROGRAM} {}",
        quote(cwd)?,
        argv.join(" ")
    ))
}

async fn exchange(handle: &Handle<ClientHandler>, line: String) -> Result<GitOutput> {
    let mut channel = handle
        .channel_open_session()
        .await
        .map_err(|e| TransportError::protocol(format!("could not open a session: {e}")))?;
    channel
        .exec(true, line.as_bytes())
        .await
        .map_err(|e| TransportError::shell(format!("could not start git: {e}")))?;

    let mut stdout = Vec::new();
    let mut stderr = Vec::new();
    let mut code: Option<i32> = None;

    while let Some(msg) = channel.wait().await {
        match msg {
            ChannelMsg::Data { ref data } => stdout.extend_from_slice(data),
            // Extended data type 1 is stderr; anything else is not ours.
            ChannelMsg::ExtendedData { ref data, ext: 1 } => stderr.extend_from_slice(data),
            ChannelMsg::ExitStatus { exit_status } => code = Some(exit_status as i32),
            ChannelMsg::Eof | ChannelMsg::Close => break,
            _ => {}
        }
    }
    let _ = channel.close().await;

    Ok(GitOutput {
        // A channel that closed without an exit status did not succeed, and
        // saying "unknown" is more honest than assuming zero.
        code,
        stdout: String::from_utf8_lossy(&stdout).into_owned(),
        stderr: String::from_utf8_lossy(&stderr).into_owned(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::git::command;

    #[test]
    fn the_working_directory_is_the_only_quoted_value() {
        let line = command_line("/srv/app", &command::status_argv()).unwrap();
        assert!(line.starts_with("cd '/srv/app' && git "));
        assert!(line.contains("--porcelain=v2"));
    }

    #[test]
    fn a_quote_in_the_remote_path_is_refused_not_escaped() {
        assert!(command_line("/srv/it's", &command::status_argv()).is_err());
    }

    #[test]
    fn an_argument_needing_quoting_is_refused_before_it_is_sent() {
        assert!(command_line("/srv/app", &["status", "; rm -rf /"]).is_err());
    }
}
