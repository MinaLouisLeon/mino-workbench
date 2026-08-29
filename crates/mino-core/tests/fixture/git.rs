//! Real repositories in a temp directory, built with real `git`.
//!
//! Against recorded output a parser can be right about a format that git never
//! actually emits. These tests run the binary, which is the only way to know
//! that the argv, the exit codes and the parser agree with the git people
//! actually have installed.
//!
//! Every test that uses this **skips** when git is absent rather than failing.
//! A machine without git is a machine this app already degrades on by design,
//! and a red suite there would be reporting the wrong thing.

use std::path::Path;
use std::process::Command;

use mino_core::types::ConnectionTarget;
use mino_core::{LocalTransport, Transport};

/// True when git can be found. Callers return early when it cannot; the
/// message is printed so a skipped test is visible rather than silent.
pub fn git_available() -> bool {
    let found = mino_core::git::find_git().is_some();
    if !found {
        eprintln!("skipped: git is not on PATH");
    }
    found
}

/// Runs one git command in `dir`, failing the test if it does not succeed.
/// Test setup, not app code: this is the one place in the repo that builds a
/// git call outside `mino_core::git::command`.
pub fn git(dir: &Path, args: &[&str]) {
    let output = Command::new("git")
        .args(args)
        .current_dir(dir)
        .output()
        .expect("git should run");
    assert!(
        output.status.success(),
        "git {args:?} failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
}

/// A repository with a commit already in it, and an identity set locally so
/// the commit works on a machine with no global git config.
pub fn repository() -> tempfile::TempDir {
    let dir = tempfile::tempdir().expect("temp dir");
    let root = dir.path();
    git(root, &["init", "--initial-branch=main"]);
    git(root, &["config", "user.email", "test@example.invalid"]);
    git(root, &["config", "user.name", "Test"]);
    // Commits must not be signed: a machine with `commit.gpgsign` on globally
    // would otherwise hang waiting for a passphrase.
    git(root, &["config", "commit.gpgsign", "false"]);

    std::fs::create_dir_all(root.join("src")).unwrap();
    std::fs::write(root.join("src/main.rs"), "fn main() {}\n").unwrap();
    std::fs::write(root.join("readme.md"), "# test\n").unwrap();
    git(root, &["add", "."]);
    git(root, &["commit", "-m", "first"]);
    dir
}

/// A transport connected to `root`, which need not be the repository root.
pub async fn connected(root: &Path) -> LocalTransport {
    let transport = LocalTransport::new();
    let target = ConnectionTarget::Local {
        root: root.to_string_lossy().into_owned(),
    };
    transport.connect(&target).await.expect("connect");
    transport
}
