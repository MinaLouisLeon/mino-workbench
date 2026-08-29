//! Mino Workbench core.
//!
//! Owns the transport interface, its three implementations and the domain
//! types shared by the desktop app and the agent daemon. It depends on neither
//! Tauri nor a web framework — see `crates/mino-core/Cargo.toml`.

#![forbid(unsafe_code)]
// `todo!()` and `unimplemented!()` are banned in this crate: an unbuilt
// transport method returns `TransportError::Unimplemented`, it never panics.
#![deny(clippy::todo, clippy::unimplemented)]

pub mod error;
pub mod local;
pub mod remote;
pub mod search;
pub mod shell;
pub mod ssh;
pub mod stub;
pub mod transport;
pub mod types;

pub use error::{Result, TransportError};
pub use local::LocalTransport;
pub use remote::RemoteAgentTransport;
pub use ssh::SshTransport;
pub use transport::Transport;
pub use types::*;

/// Builds the transport that serves a target. The only place a transport is
/// chosen; callers never construct implementations directly.
pub fn transport_for(target: &types::ConnectionTarget) -> std::sync::Arc<dyn Transport> {
    match target {
        types::ConnectionTarget::Local { .. } => std::sync::Arc::new(LocalTransport::new()),
        types::ConnectionTarget::Ssh { .. } => std::sync::Arc::new(SshTransport::new()),
        types::ConnectionTarget::RemoteAgent { .. } => {
            std::sync::Arc::new(RemoteAgentTransport::new())
        }
    }
}
