//! Shared body for a git surface that compiles but is not built yet.
//!
//! The sibling of [`crate::stub`], kept separate for the reason `GitTransport`
//! is separate from `Transport`: a transport whose filesystem half is built
//! and whose git half is not should be able to say so without one macro
//! answering for both. The remote-agent transport uses both today.
//!
//! Note what this does *not* do. An unbuilt git surface answers
//! `Unimplemented`; it does not answer "there is no repository here". Absence
//! and not-built-yet read the same in a quiet UI and are entirely different
//! facts, and only one of them is a bug waiting to be finished.

/// Generates `impl GitTransport` where every method returns
/// [`crate::TransportError::Unimplemented`] naming the transport and the
/// method. Replace methods one at a time as a transport is built out.
#[macro_export]
macro_rules! unimplemented_git_transport {
    ($ty:ty, $kind:expr) => {
        #[::async_trait::async_trait]
        impl $crate::transport::GitTransport for $ty {
            async fn repository(&self) -> $crate::Result<Option<$crate::types::GitRepository>> {
                Err($crate::TransportError::unimplemented(
                    $kind,
                    "git_repository",
                ))
            }

            async fn status(&self) -> $crate::Result<$crate::types::GitStatus> {
                Err($crate::TransportError::unimplemented($kind, "git_status"))
            }
        }
    };
}
