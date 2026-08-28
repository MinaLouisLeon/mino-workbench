//! Daemon configuration, and the loopback rule.
//!
//! SECURITY: the agent has no authentication yet (see the open task in
//! docs/mino-workbench/endpoints.md). Until it does, it must never listen on an
//! address other people can reach - a PTY endpoint on a routable interface is
//! a remote shell for anyone who finds it. The check below is a hard refusal,
//! not a warning, and there is no flag that disables it.

use std::net::{IpAddr, Ipv4Addr, SocketAddr};

use clap::Parser;

pub const DEFAULT_PORT: u16 = 8731;

#[derive(Debug, Clone, Parser)]
#[command(
    name = "mino-agent",
    version = env!("CARGO_PKG_VERSION"),
    about = "Mino Workbench agent daemon"
)]
pub struct AgentConfig {
    /// Address to listen on. Must be a loopback address.
    #[arg(long, default_value_t = IpAddr::V4(Ipv4Addr::LOCALHOST))]
    pub bind: IpAddr,

    #[arg(long, default_value_t = DEFAULT_PORT)]
    pub port: u16,
}

impl AgentConfig {
    pub fn socket_addr(&self) -> anyhow::Result<SocketAddr> {
        if !self.bind.is_loopback() {
            anyhow::bail!(
                "refusing to bind to {}: the agent has no authentication yet, so it may only \
                 listen on a loopback address. Tunnel to it over SSH instead.",
                self.bind
            );
        }
        Ok(SocketAddr::new(self.bind, self.port))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_loopback() {
        let config = AgentConfig {
            bind: IpAddr::V4(Ipv4Addr::LOCALHOST),
            port: DEFAULT_PORT,
        };
        assert!(config.socket_addr().is_ok());
    }

    #[test]
    fn refuses_a_routable_address() {
        let config = AgentConfig {
            bind: IpAddr::V4(Ipv4Addr::new(0, 0, 0, 0)),
            port: DEFAULT_PORT,
        };
        assert!(config.socket_addr().is_err());
    }
}
