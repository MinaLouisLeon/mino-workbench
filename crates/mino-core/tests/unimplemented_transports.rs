//! Proves the interface holds against a transport that is declared but not
//! built: the remote-agent transport compiles, answers every method, and never
//! panics.
//!
//! The SSH transport used to be asserted here too. It is implemented now, so
//! its contract moved to `ssh_transport.rs` - an unbuilt method there would be
//! a regression, not the expected answer.

use mino_core::types::{
    ConnectionTarget, PtySessionId, PtySize, PtySpawnSpec, ReadFileOptions, SearchQuery,
    StructuredRequest, TransportKind,
};
use mino_core::{RemoteAgentTransport, Transport, TransportError};

fn is_unimplemented(err: TransportError, expected: TransportKind) -> bool {
    matches!(err, TransportError::Unimplemented { transport, .. } if transport == expected)
}

async fn assert_every_method_unimplemented(
    transport: &dyn Transport,
    kind: TransportKind,
    target: ConnectionTarget,
) {
    let id = PtySessionId::new();
    let size = PtySize { cols: 80, rows: 24 };

    assert!(is_unimplemented(
        transport.connect(&target).await.unwrap_err(),
        kind
    ));
    assert!(is_unimplemented(
        transport.disconnect().await.unwrap_err(),
        kind
    ));
    assert!(is_unimplemented(
        transport.list_dir("/").await.unwrap_err(),
        kind
    ));
    assert!(is_unimplemented(
        transport.stat("/").await.unwrap_err(),
        kind
    ));
    assert!(is_unimplemented(
        transport
            .search_files(SearchQuery::new("main"))
            .await
            .unwrap_err(),
        kind
    ));
    assert!(is_unimplemented(
        transport
            .read_file("/x", ReadFileOptions::default())
            .await
            .unwrap_err(),
        kind
    ));
    assert!(is_unimplemented(
        transport
            .open_pty(PtySpawnSpec { cwd: None, size })
            .await
            .unwrap_err(),
        kind
    ));
    assert!(is_unimplemented(
        transport.write_pty(&id, "ls").await.unwrap_err(),
        kind
    ));
    assert!(is_unimplemented(
        transport.resize_pty(&id, size).await.unwrap_err(),
        kind
    ));
    assert!(is_unimplemented(
        transport.close_pty(&id).await.unwrap_err(),
        kind
    ));
    assert!(is_unimplemented(
        transport
            .run_structured(StructuredRequest::new("ls | to json"))
            .await
            .unwrap_err(),
        kind
    ));
    assert!(is_unimplemented(
        transport.probe_shell().await.unwrap_err(),
        kind
    ));

    // The git surface is present rather than absent: `None` would read as
    // "this target has no git", which is a different fact from "not written
    // yet" and would send the reader to the wrong file.
    let git = transport
        .git()
        .expect("an unbuilt git surface is still a surface");
    assert!(is_unimplemented(git.repository().await.unwrap_err(), kind));
    assert!(is_unimplemented(git.status().await.unwrap_err(), kind));

    let paths = ["/srv/app/x".to_string()];
    assert!(is_unimplemented(git.stage(&paths).await.unwrap_err(), kind));
    assert!(is_unimplemented(
        git.unstage(&paths).await.unwrap_err(),
        kind
    ));
    assert!(is_unimplemented(
        git.discard(&paths).await.unwrap_err(),
        kind
    ));
    assert!(is_unimplemented(
        git.commit(mino_core::types::CommitRequest::new("m"))
            .await
            .unwrap_err(),
        kind
    ));
    assert!(is_unimplemented(
        git.diff(mino_core::types::DiffRequest::worktree())
            .await
            .unwrap_err(),
        kind
    ));
    assert!(is_unimplemented(
        git.log(mino_core::types::LogRequest::new())
            .await
            .unwrap_err(),
        kind
    ));
    assert!(is_unimplemented(git.show("HEAD").await.unwrap_err(), kind));
    assert!(is_unimplemented(
        git.commit_diff("HEAD", None).await.unwrap_err(),
        kind
    ));
    assert!(is_unimplemented(
        git.blame("/srv/app/x").await.unwrap_err(),
        kind
    ));
}

#[tokio::test]
async fn remote_agent_transport_answers_every_method() {
    let transport = RemoteAgentTransport::new();
    assert_eq!(transport.kind(), TransportKind::RemoteAgent);
    assert!(transport.url().is_none());
    let target = ConnectionTarget::RemoteAgent {
        url: "ws://127.0.0.1:8731/ws".to_string(),
        root: "/srv".to_string(),
    };
    assert_every_method_unimplemented(&transport, TransportKind::RemoteAgent, target).await;
}
