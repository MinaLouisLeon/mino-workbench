//! Opening a remote PTY.
//!
//! Split from `transport_impl` because choosing the program, resolving the
//! working directory and building the launch line is a sequence worth reading
//! on its own.

use crate::error::Result;
use crate::scripts::{self, Platform, Through};
use crate::types::{PtySession, PtySessionId, PtySpawnSpec, PtyStream, ShellKind};

use super::pty::PtyRegistry;
use super::{command, fs, Connected, SshTransport};

/// The argv of the script `spec` names, looked up again on the remote host.
///
/// Called before the connection is borrowed for the launch: the lookup reads
/// over SFTP through the same `connected()` every other call takes. The host
/// is POSIX, as the shell probe already assumes.
pub(super) async fn script_argv(
    transport: &SshTransport,
    spec: &PtySpawnSpec,
) -> Result<Option<Vec<String>>> {
    match &spec.script {
        Some(script) => Ok(Some(
            scripts::resolve(&Through(transport), Platform::Unix, script).await?,
        )),
        None => Ok(None),
    }
}

pub(super) async fn open(
    ptys: &PtyRegistry,
    connected: &Connected,
    spec: PtySpawnSpec,
    argv: Option<&[String]>,
) -> Result<PtyStream> {
    // A script runs in its own folder; anything else where it was asked to.
    let requested = match &spec.script {
        Some(script) => Some(script.dir.as_str()),
        None => spec.cwd.as_deref(),
    };
    let cwd = match requested {
        Some(requested) => fs::resolve(&connected.sftp, &connected.root, requested).await?,
        None => connected.root.root().to_string(),
    };

    let probe = &connected.shell;
    let program = match &probe.nu_path {
        Some(nu) => nu.clone(),
        None => probe.fallback_program.clone(),
    };
    let id = PtySessionId::new();
    // The shell is started inside the session root; `command` is built
    // from quoted paths only, never from free text.
    let launch = match argv {
        Some(argv) => command::command_line_script(&program, &cwd, argv)?,
        None => command::command_line_shell(&program, &cwd)?,
    };

    let events = ptys
        .open(&connected.handle, &id, spec.size, Some(&launch))
        .await?;

    Ok(PtyStream {
        session: PtySession {
            id,
            program,
            shell: if probe.nu_available {
                ShellKind::Nu
            } else {
                ShellKind::Fallback
            },
            cwd,
            size: spec.size.sanitised(),
            fell_back: !probe.nu_available,
        },
        events,
    })
}
