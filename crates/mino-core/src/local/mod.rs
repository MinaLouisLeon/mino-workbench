//! The local transport: the only implementation that does real work in
//! phase 1.
//!
//! Directory listings prefer the structured Nushell channel and degrade to a
//! plain filesystem walk when `nu` is missing or the pipeline fails, so the
//! tree keeps working on a machine without Nushell.

mod fs;
mod pipelines;
mod pty;
mod pty_spawn;
mod read;
mod roots;
mod search;
mod structured;
mod transport_impl;
mod write;

use std::sync::RwLock;

use crate::error::{Result, TransportError};
use crate::shell;
use crate::types::{DirEntry, StructuredRequest};

use pty::PtyRegistry;
use roots::RootGuard;

/// The binary sniff is transport-independent: the SSH transport applies the
/// same rule to bytes it pulled over SFTP, and one definition means the two
/// cannot drift into disagreeing about what "binary" is.
pub use read::looks_binary;

pub struct LocalTransport {
    root: RwLock<Option<RootGuard>>,
    ptys: PtyRegistry,
}

impl Default for LocalTransport {
    fn default() -> Self {
        Self::new()
    }
}

impl LocalTransport {
    pub fn new() -> Self {
        Self {
            root: RwLock::new(None),
            ptys: PtyRegistry::new(),
        }
    }

    fn guard(&self) -> Result<RootGuard> {
        self.root
            .read()
            .map_err(|_| TransportError::io("the connection lock was poisoned"))?
            .clone()
            .ok_or(TransportError::NotConnected)
    }

    /// Structured first, filesystem second. The filesystem path is also what
    /// raises the typed not-found and permission errors.
    async fn list_via_nu(&self, dir: &str) -> Result<Vec<DirEntry>> {
        let nu = shell::find_nu().ok_or_else(|| TransportError::shell("nushell is not on PATH"))?;
        let request = StructuredRequest::new(pipelines::LIST_DIR)
            .param(pipelines::PARAM_PATH, dir)
            .cwd(dir);
        let output = structured::run(&nu, &request).await?;
        let mut entries = pipelines::entries_from_list(&output.value, dir)?;
        fs::sort_entries(&mut entries);
        Ok(entries)
    }
}
