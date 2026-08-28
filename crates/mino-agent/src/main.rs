//! Mino Workbench agent daemon.
//!
//! Phase 1 starts, binds to loopback and serves the endpoint skeleton. It does
//! not yet execute anything: every transport route answers "not implemented"
//! until authentication exists. See docs/mino-workbench/endpoints.md.

mod config;
mod http;
mod protocol;
mod ws;

use clap::Parser;

use config::AgentConfig;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "mino_agent=info,mino_core=info".into()),
        )
        .init();

    let config = AgentConfig::parse();
    let addr = config.socket_addr()?;
    let listener = tokio::net::TcpListener::bind(addr).await?;

    tracing::info!(%addr, "mino-agent listening on loopback");
    tracing::warn!(
        "authentication is not implemented yet: this build refuses every transport route and \
         closes every websocket. Do not expose this port."
    );

    axum::serve(listener, http::router()).await?;
    Ok(())
}
