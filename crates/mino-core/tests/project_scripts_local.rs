//! `list_project_scripts` and a script `open_pty` over a real folder: the
//! workspace walk, the path guard, and the refusals that happen before any
//! process is spawned.

use mino_core::types::{ConnectionTarget, PtySize, PtySpawnSpec, ScriptRef, ScriptSource};
use mino_core::{LocalTransport, Transport, TransportError};

mod fixture;
use fixture::scripts::{names, one};

/// An npm workspace with two packages, one excluded, and a Makefile.
async fn workspace() -> (tempfile::TempDir, LocalTransport) {
    let dir = tempfile::tempdir().expect("temp dir");
    let root = dir.path();
    let write = |path: &str, text: &str| {
        let path = root.join(path);
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(path, text).unwrap();
    };
    write(
        "package.json",
        r#"{ "workspaces": ["packages/*", "!packages/legacy"], "scripts": { "dev": "vite" } }"#,
    );
    write("pnpm-lock.yaml", "");
    write("Makefile", "build:\n\techo\n");
    write(
        "packages/web/package.json",
        r#"{ "name": "web", "scripts": { "start": "next" } }"#,
    );
    write(
        "packages/legacy/package.json",
        r#"{ "scripts": { "old": "x" } }"#,
    );
    std::fs::create_dir_all(root.join("node_modules/dep")).unwrap();

    let transport = LocalTransport::new();
    let target = ConnectionTarget::Local {
        root: root.to_string_lossy().into_owned(),
    };
    transport.connect(&target).await.expect("connect");
    (dir, transport)
}

#[tokio::test]
async fn listing_before_connect_is_typed_not_connected() {
    let err = LocalTransport::new()
        .list_project_scripts()
        .await
        .unwrap_err();
    assert!(matches!(err, TransportError::NotConnected));
}

#[tokio::test]
async fn the_root_and_its_workspace_members_are_listed() {
    let (_dir, transport) = workspace().await;
    let catalog = transport.list_project_scripts().await.expect("scan");

    assert_eq!(names(&catalog.scripts, ScriptSource::Npm), ["dev", "start"]);
    assert_eq!(names(&catalog.scripts, ScriptSource::Make), ["build"]);
    let start = one(&catalog.scripts, ScriptSource::Npm, "start");
    assert_eq!(start.dir, "packages/web");
    assert_eq!(start.package, "web");
    // The member has no lockfile; the root's says pnpm.
    assert_eq!(start.runner, "pnpm");
    assert!(!catalog.truncated);
    assert_eq!(catalog.skipped, 0);
}

fn spec(script: ScriptRef) -> PtySpawnSpec {
    PtySpawnSpec {
        cwd: None,
        size: PtySize { cols: 80, rows: 24 },
        script: Some(script),
    }
}

#[tokio::test]
async fn a_script_the_folder_no_longer_defines_is_refused_before_spawning() {
    let (_dir, transport) = workspace().await;
    let gone = ScriptRef {
        source: ScriptSource::Npm,
        dir: String::new(),
        name: "deploy".to_string(),
    };
    let err = transport.open_pty(spec(gone)).await.unwrap_err();
    assert!(
        matches!(err, TransportError::InvalidArgument { .. }),
        "{err:?}"
    );
}

#[tokio::test]
async fn a_script_folder_outside_the_root_is_refused() {
    let (_dir, transport) = workspace().await;
    for dir in ["..", "../elsewhere", "/etc", "C:\\Windows"] {
        let outside = ScriptRef {
            source: ScriptSource::Npm,
            dir: dir.to_string(),
            name: "dev".to_string(),
        };
        let err = transport.open_pty(spec(outside)).await.unwrap_err();
        assert!(
            matches!(err, TransportError::InvalidArgument { .. }),
            "{dir}: {err:?}"
        );
    }
}
