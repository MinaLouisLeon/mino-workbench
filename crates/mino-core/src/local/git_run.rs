//! Running `git` on this machine.
//!
//! The same shape `structured.rs` uses for `nu`: an argv array handed to
//! `tokio::process::Command`, never a shell line, so nothing anywhere in the
//! arguments is parsed as syntax. The arguments come from
//! [`crate::git::command`]; the caller values among them - paths - are guarded
//! by [`crate::git::guard`] before they arrive. The working directory is set
//! with `current_dir` rather than written into a command, and a commit message
//! goes on stdin rather than into the arguments at all.

use std::process::Stdio;

use tokio::io::AsyncWriteExt;
use tokio::process::Command;

use crate::error::{Result, TransportError};
use crate::git::{self, command::DEFAULT_TIMEOUT_MS, GitOutput};

/// Runs one git call in `cwd` and collects its output.
///
/// `kill_on_drop` matters here: a status on a cold, very large repository can
/// outlast the timeout, and a dropped future must not leave git running
/// against the index.
pub async fn run(cwd: &str, argv: &[&str]) -> Result<GitOutput> {
    let owned: Vec<String> = argv.iter().map(|arg| (*arg).to_string()).collect();
    run_with_input(cwd, &owned, None).await
}

/// The same, with `input` written to git's stdin and the pipe then closed.
///
/// This is how a commit message reaches git. It is not an optimisation: over
/// SSH the argv becomes a command line, and a message containing an apostrophe
/// would be refused by the quoting rule. On stdin it is bytes, and nothing
/// parses it. See `git::command`.
pub async fn run_with_input(cwd: &str, argv: &[String], input: Option<&str>) -> Result<GitOutput> {
    let program = git::find_git().ok_or_else(git::missing)?;

    let mut child = Command::new(&program)
        .args(argv.iter().map(String::as_str))
        .current_dir(cwd)
        .stdin(if input.is_some() {
            Stdio::piped()
        } else {
            Stdio::null()
        })
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| TransportError::shell(format!("could not start git: {e}")))?;

    if let Some(text) = input {
        // Taken and dropped, so the pipe closes. Without the close git waits
        // on stdin forever and the call times out instead of committing.
        let mut stdin = child
            .stdin
            .take()
            .ok_or_else(|| TransportError::shell("git did not accept its input"))?;
        stdin
            .write_all(text.as_bytes())
            .await
            .map_err(|e| TransportError::shell(format!("could not write the git input: {e}")))?;
        stdin
            .shutdown()
            .await
            .map_err(|e| TransportError::shell(format!("could not close the git input: {e}")))?;
    }

    let output = tokio::time::timeout(
        std::time::Duration::from_millis(DEFAULT_TIMEOUT_MS),
        child.wait_with_output(),
    )
    .await
    .map_err(|_| TransportError::Timeout {
        operation: format!("git {}", argv.first().map_or("call", String::as_str)),
        ms: DEFAULT_TIMEOUT_MS,
    })?
    .map_err(|e| TransportError::shell(e.to_string()))?;

    Ok(GitOutput {
        code: output.status.code(),
        // Lossy on purpose. `-z` keeps paths unquoted, and a path that is not
        // valid UTF-8 should cost one mangled row rather than the whole
        // status.
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
    })
}
