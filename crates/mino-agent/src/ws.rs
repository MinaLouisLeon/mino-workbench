//! The WebSocket surface.
//!
//! SECURITY: this endpoint would carry PTY traffic, so it stays closed until
//! authentication exists. The handler accepts the upgrade, sends one typed
//! error frame so a client sees why, and closes. It never reaches a transport.

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::response::IntoResponse;

use crate::protocol::{AgentResponse, Envelope};

pub async fn upgrade(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(refuse)
}

async fn refuse(mut socket: WebSocket) {
    let frame = Envelope {
        id: "0".to_string(),
        body: AgentResponse::unauthenticated("websocket transport"),
    };
    match serde_json::to_string(&frame) {
        Ok(text) => {
            let _ = socket.send(Message::Text(text.into())).await;
        }
        Err(err) => tracing::error!(%err, "could not encode the refusal frame"),
    }
    let _ = socket.send(Message::Close(None)).await;
}
