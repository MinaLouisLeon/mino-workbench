//! Shared body for a transport that compiles but is not built yet.
//!
//! The SSH and remote-agent transports both need all twelve methods to exist
//! and to answer with a typed `Unimplemented` error rather than a panic. That
//! body is identical for both, so it lives here once instead of being copied
//! into each module.

/// Generates `impl Transport` where every method returns
/// [`crate::TransportError::Unimplemented`] naming the transport and the
/// method. Replace methods one at a time as a transport is built out.
#[macro_export]
macro_rules! unimplemented_transport {
    ($ty:ty, $kind:expr) => {
        #[::async_trait::async_trait]
        impl $crate::transport::Transport for $ty {
            fn kind(&self) -> $crate::types::TransportKind {
                $kind
            }

            async fn connect(
                &self,
                _target: &$crate::types::ConnectionTarget,
            ) -> $crate::Result<$crate::types::ConnectionInfo> {
                Err($crate::TransportError::unimplemented($kind, "connect"))
            }

            async fn disconnect(&self) -> $crate::Result<()> {
                Err($crate::TransportError::unimplemented($kind, "disconnect"))
            }

            async fn list_dir(&self, _path: &str) -> $crate::Result<Vec<$crate::types::DirEntry>> {
                Err($crate::TransportError::unimplemented($kind, "list_dir"))
            }

            async fn stat(&self, _path: &str) -> $crate::Result<$crate::types::DirEntry> {
                Err($crate::TransportError::unimplemented($kind, "stat"))
            }

            async fn read_file(
                &self,
                _path: &str,
                _options: $crate::types::ReadFileOptions,
            ) -> $crate::Result<$crate::types::FilePayload> {
                Err($crate::TransportError::unimplemented($kind, "read_file"))
            }

            async fn write_file(
                &self,
                _path: &str,
                _request: $crate::types::WriteRequest,
            ) -> $crate::Result<$crate::types::DirEntry> {
                Err($crate::TransportError::unimplemented($kind, "write_file"))
            }

            async fn open_pty(
                &self,
                _spec: $crate::types::PtySpawnSpec,
            ) -> $crate::Result<$crate::types::PtyStream> {
                Err($crate::TransportError::unimplemented($kind, "open_pty"))
            }

            async fn write_pty(
                &self,
                _id: &$crate::types::PtySessionId,
                _data: &str,
            ) -> $crate::Result<()> {
                Err($crate::TransportError::unimplemented($kind, "write_pty"))
            }

            async fn resize_pty(
                &self,
                _id: &$crate::types::PtySessionId,
                _size: $crate::types::PtySize,
            ) -> $crate::Result<()> {
                Err($crate::TransportError::unimplemented($kind, "resize_pty"))
            }

            async fn close_pty(&self, _id: &$crate::types::PtySessionId) -> $crate::Result<()> {
                Err($crate::TransportError::unimplemented($kind, "close_pty"))
            }

            async fn run_structured(
                &self,
                _request: $crate::types::StructuredRequest,
            ) -> $crate::Result<$crate::types::StructuredOutput> {
                Err($crate::TransportError::unimplemented(
                    $kind,
                    "run_structured",
                ))
            }

            async fn probe_shell(&self) -> $crate::Result<$crate::types::ShellProbe> {
                Err($crate::TransportError::unimplemented($kind, "probe_shell"))
            }
        }
    };
}
