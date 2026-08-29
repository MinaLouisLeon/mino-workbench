//! Running `git` on the remote host.
//!
//! The awkward half of the shell-out decision, and the reason it is still the
//! right one: the remote host has its own git, so a repository over SSH works
//! with no extra machinery - but `exec` hands a *string* to the remote login
//! shell, so the argv array has to become a command line somewhere.
//!
//! It becomes one here, under three rules:
//!
//! - **Every argument is quoted**, not merely joined. Phase 2 passes paths, and
//!   a path is a caller value.
//! - Paths have already been through [`crate::git::guard`] against the session
//!   root before they arrive, so quoting is the second line of defence and not
//!   the first.
//! - [`super::command::quote`] *refuses* a value containing a single quote
//!   rather than escaping it, so a remote file whose name contains one is a
//!   typed error rather than a mangled command. That is why the commit
//!   message - the caller value most likely to contain an apostrophe - travels
//!   on **stdin** and never through here at all.

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
    let owned: Vec<String> = argv.iter().map(|arg| (*arg).to_string()).collect();
    run_with_input(handle, cwd, &owned, None).await
}

/// The same, with `input` sent on the channel's stdin before EOF.
///
/// This is the whole reason a commit message is not an argument. The line
/// below is parsed by the remote login shell, and `quote` refuses a value
/// containing a single quote - which would refuse every commit message with an
/// apostrophe in it. On stdin the message is bytes that nothing parses.
pub async fn run_with_input(
    handle: &Handle<ClientHandler>,
    cwd: &str,
    argv: &[String],
    input: Option<&str>,
) -> Result<GitOutput> {
    let line = command_line(cwd, argv)?;
    tokio::time::timeout(
        std::time::Duration::from_millis(TIMEOUT_MS),
        exchange(handle, line, input.map(str::to_string)),
    )
    .await
    .map_err(|_| TransportError::Timeout {
        operation: "git".to_string(),
        ms: TIMEOUT_MS,
    })?
}

/// `cd '<cwd>' && git '<arg>' '<arg>' …`.
///
/// Every argument is quoted, not just the working directory. Phase 1 could get
/// away with joining them raw because all of them were flags and subcommand
/// names; phase 2 passes **paths**, and a path with a space in it would
/// otherwise arrive at the remote git as two arguments.
///
/// `quote` refuses rather than escapes a value containing a single quote, so a
/// remote file whose name contains one is reported as a typed error instead of
/// being silently mishandled. That is the documented limit of the SSH
/// transport, and it is why the commit message - the one caller value likely
/// to contain an apostrophe - travels on stdin instead.
fn command_line(cwd: &str, argv: &[String]) -> Result<String> {
    let mut line = format!("cd {} && {GIT_PROGRAM}", quote(cwd)?);
    for arg in argv {
        line.push(' ');
        line.push_str(&quote(arg)?);
    }
    Ok(line)
}

async fn exchange(
    handle: &Handle<ClientHandler>,
    line: String,
    input: Option<String>,
) -> Result<GitOutput> {
    let mut channel = handle
        .channel_open_session()
        .await
        .map_err(|e| TransportError::protocol(format!("could not open a session: {e}")))?;
    channel
        .exec(true, line.as_bytes())
        .await
        .map_err(|e| TransportError::shell(format!("could not start git: {e}")))?;

    if let Some(text) = input {
        channel
            .data(text.as_bytes())
            .await
            .map_err(|e| TransportError::shell(format!("could not send the git input: {e}")))?;
    }
    // Always, input or not. Without EOF a `git commit --file -` waits on
    // stdin forever and the call times out instead of committing.
    channel
        .eof()
        .await
        .map_err(|e| TransportError::shell(format!("could not close the git input: {e}")))?;

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
mod tests;
