//! Opening a local PTY: a plain shell, or a shell that runs a script first.
//!
//! Split from `transport_impl` for the same reason the SSH transport splits
//! it: choosing the program, the folder and the launch line is a sequence
//! worth reading on its own.

use crate::error::Result;
use crate::scripts::{self, launch, Platform};
use crate::shell;
use crate::types::{PtySpawnSpec, PtyStream, ShellKind};

use super::pty::SpawnRequest;
use super::scan::LocalScan;
use super::{roots, LocalTransport};

pub(super) async fn open(transport: &LocalTransport, spec: PtySpawnSpec) -> Result<PtyStream> {
    let guard = transport.guard()?;
    let probe = shell::probe();
    let (program, kind) = match probe.nu_path {
        Some(nu) => (nu, ShellKind::Nu),
        None => (probe.fallback_program, ShellKind::Fallback),
    };

    let (cwd, launch) = match &spec.script {
        None => {
            let cwd = match &spec.cwd {
                Some(cwd) => roots::display_path(&guard.resolve(cwd)?),
                None => guard.root_display(),
            };
            (cwd, launch::Launch::shell(&program))
        }
        Some(script) => {
            // Looked up again rather than trusted: the argv comes from the
            // folder as it reads now, through the same guard as every read.
            let platform = Platform::local();
            let argv = scripts::resolve(&LocalScan(guard.clone()), platform, script).await?;
            let cwd = roots::display_path(&guard.resolve(&script.dir)?);
            (cwd, launch::local(&program, kind, platform, &argv)?)
        }
    };

    transport.ptys.open(SpawnRequest {
        fell_back: kind == ShellKind::Fallback,
        program,
        launch,
        shell: kind,
        cwd,
        size: spec.size,
    })
}
