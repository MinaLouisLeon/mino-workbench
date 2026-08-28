//! The HTTP surface.
//!
//! `/health` and `/version` answer for real so a supervisor can watch the
//! process. `/transport` is the skeleton of the request/response surface and
//! answers 501 with a typed error until authentication exists.

use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{http::StatusCode, Json, Router};

use crate::protocol::{
    AgentRequest, AgentResponse, ROUTE_HEALTH, ROUTE_TRANSPORT, ROUTE_VERSION, ROUTE_WS,
};
use crate::ws;

pub const PROTOCOL_VERSION: &str = "1";

pub fn router() -> Router {
    Router::new()
        .route(ROUTE_HEALTH, get(health))
        .route(ROUTE_VERSION, get(version))
        .route(ROUTE_TRANSPORT, post(transport))
        .route(ROUTE_WS, get(ws::upgrade))
}

async fn health() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

async fn version() -> impl IntoResponse {
    Json(serde_json::json!({
        "name": env!("CARGO_PKG_NAME"),
        "version": env!("CARGO_PKG_VERSION"),
        "protocol": PROTOCOL_VERSION,
        "authenticated": false,
    }))
}

/// Phase 1: the body is parsed so the schema is exercised, then refused. The
/// request never reaches a transport, so no filesystem or shell call can be
/// made through this route.
async fn transport(body: String) -> impl IntoResponse {
    let feature = serde_json::from_str::<AgentRequest>(&body)
        .map(|request| method_name(&request))
        .unwrap_or("transport");
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(AgentResponse::unauthenticated(feature)),
    )
}

fn method_name(request: &AgentRequest) -> &'static str {
    match request {
        AgentRequest::Connect { .. } => "connect",
        AgentRequest::Disconnect => "disconnect",
        AgentRequest::ListDir { .. } => "list_dir",
        AgentRequest::Stat { .. } => "stat",
        AgentRequest::ReadFile { .. } => "read_file",
        AgentRequest::OpenPty { .. } => "open_pty",
        AgentRequest::WritePty { .. } => "write_pty",
        AgentRequest::ResizePty { .. } => "resize_pty",
        AgentRequest::ClosePty { .. } => "close_pty",
        AgentRequest::RunStructured { .. } => "run_structured",
        AgentRequest::ProbeShell => "probe_shell",
    }
}
