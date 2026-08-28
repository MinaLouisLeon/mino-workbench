//! The agent wire protocol.
//!
//! One request variant per `Transport` trait method, one response variant per
//! result, plus unsolicited `PtyEvent` pushes. Written down once here so the
//! daemon and `mino_core::remote::RemoteAgentTransport` are built against a
//! single definition rather than two drifting ones.

use mino_core::types::{
    ConnectionInfo, ConnectionTarget, DirEntry, FilePayload, PtyEvent, PtySession, PtySessionId,
    PtySize, PtySpawnSpec, ReadFileOptions, ShellProbe, StructuredOutput, StructuredRequest,
};
use mino_core::TransportError;
use serde::{Deserialize, Serialize};

pub const ROUTE_HEALTH: &str = "/health";
pub const ROUTE_VERSION: &str = "/version";
pub const ROUTE_TRANSPORT: &str = "/transport";
pub const ROUTE_WS: &str = "/ws";

/// Correlates a response with the request that caused it. `id` is minted by
/// the client; pushes carry the id of the call that opened the session.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Envelope<T> {
    pub id: String,
    pub body: T,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "method", content = "params", rename_all = "camelCase")]
pub enum AgentRequest {
    Connect {
        target: ConnectionTarget,
    },
    Disconnect,
    ListDir {
        path: String,
    },
    Stat {
        path: String,
    },
    ReadFile {
        path: String,
        options: ReadFileOptions,
    },
    OpenPty {
        spec: PtySpawnSpec,
    },
    WritePty {
        id: PtySessionId,
        data: String,
    },
    ResizePty {
        id: PtySessionId,
        size: PtySize,
    },
    ClosePty {
        id: PtySessionId,
    },
    RunStructured {
        request: StructuredRequest,
    },
    ProbeShell,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "result", content = "data", rename_all = "camelCase")]
pub enum AgentResponse {
    Connected(ConnectionInfo),
    Listing(Vec<DirEntry>),
    Stat(DirEntry),
    File(FilePayload),
    PtyOpened(PtySession),
    Structured(StructuredOutput),
    Shell(ShellProbe),
    /// Acknowledges a call with no payload: disconnect, write, resize, close.
    Ack,
    /// Pushed, not requested: live output from an open session.
    PtyEvent {
        id: PtySessionId,
        event: PtyEvent,
    },
    Error(TransportError),
}

impl AgentResponse {
    /// The single answer phase 1 gives to every transport call. Authentication
    /// has to land before any of these do real work.
    pub fn unauthenticated(feature: &str) -> Self {
        Self::Error(TransportError::unimplemented(
            mino_core::types::TransportKind::RemoteAgent,
            format!("{feature} (the agent has no authentication yet)"),
        ))
    }
}
