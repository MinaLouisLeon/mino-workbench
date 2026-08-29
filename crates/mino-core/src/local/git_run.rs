//! Running `git` on this machine.
//!
//! The same shape `structured.rs` uses for `nu`: an argv array handed to
//! `tokio::process::Command`, never a shell line, so there is nothing for a
//! path or a branch name to be parsed as. The arguments come from
//! [`crate::git::command`] and are fixed program text; the only
//! caller-influenced value is the working directory, and that is set with
//! `current_dir` rather than written into a command.

use std::process::Stdio;

use tokio::process::Command;

use crate::error::{Result, TransportError};
use crate::git::{self, command::DEFAULT_TIMEOUT_MS, GitOutput};

/// Runs one git call in `cwd` and collects its output.
///
/// `kill_on_drop` matters here: a status on a cold, very large repository can
/// outlast the timeout, and a dropped future must not leave git running
/// against the index.
pub async fn run(cwd: &str, argv: &[&str]) -> Result<GitOutput> {
    let program = git::find_git().ok_or_else(git::missing)?;

    let child = Command::new(&program)
        .args(argv)
        .current_dir(cwd)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| TransportError::shell(format!("could not start git: {e}")))?;

    let output = tokio::time::timeout(
        std::time::Duration::from_millis(DEFAULT_TIMEOUT_MS),
        child.wait_with_output(),
    )
    .await
    .map_err(|_| TransportError::Timeout {
        operation: format!("git {}", argv.last().copied().unwrap_or("call")),
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
