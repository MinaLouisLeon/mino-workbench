//! The task-runner and toolchain detectors: make, just, go-task, Cargo and
//! Go. Python's are in `project_scripts_python.rs`.

use mino_core::scripts::Platform;
use mino_core::types::ScriptSource;

mod fixture;
use fixture::scripts::{folder, found, names, one, with_child};

#[test]
fn makefile_targets_skip_specials_patterns_and_assignments() {
    let text = "\
.PHONY: build test
CC := gcc
VERSION = 1
build: deps
\t$(CC) main.c
test lint: build
%.o: %.c
$(OUT): x
";
    let root = folder("", &[("Makefile", text)]);
    let scripts = found(&root, Platform::Unix);
    assert_eq!(
        names(&scripts, ScriptSource::Make),
        ["build", "test", "lint"]
    );
    assert_eq!(
        one(&scripts, ScriptSource::Make, "lint").command,
        "make lint"
    );
}

#[test]
fn justfile_recipes_skip_settings_aliases_and_private_ones() {
    let text = "\
set shell := [\"bash\", \"-c\"]
alias b := build
version := \"1.0\"

# Build it
build target='debug':
    cargo build
@serve port=\"8080\":
    run
_helper:
    echo
";
    let root = folder("", &[("justfile", text)]);
    assert_eq!(
        names(&found(&root, Platform::Unix), ScriptSource::Just),
        ["build", "serve"]
    );
}

#[test]
fn taskfile_tasks_are_the_keys_under_tasks() {
    let text = "\
version: '3'
vars:
  NAME: x
tasks:
  build:
    cmds:
      - go build
  'test:unit':
    cmds: [go test]
  lint: golangci-lint run
";
    let root = folder("", &[("Taskfile.yml", text)]);
    assert_eq!(
        names(&found(&root, Platform::Unix), ScriptSource::Task),
        ["build", "test:unit", "lint"]
    );
}

#[test]
fn a_crate_with_a_main_can_be_run_and_a_virtual_workspace_cannot() {
    let crate_toml = "[package]\nname = \"tool\"\nversion = \"0.1.0\"\n";
    let binary = with_child(
        folder("", &[("Cargo.toml", crate_toml)]),
        "src",
        &["main.rs"],
    );
    let scripts = found(&binary, Platform::Unix);
    assert_eq!(
        names(&scripts, ScriptSource::Cargo),
        ["build", "run", "test", "check"]
    );
    assert_eq!(one(&scripts, ScriptSource::Cargo, "run").package, "tool");

    let workspace = folder(
        "",
        &[("Cargo.toml", "[workspace]\nmembers = [\"crates/*\"]\n")],
    );
    assert_eq!(
        names(&found(&workspace, Platform::Unix), ScriptSource::Cargo),
        ["build", "test", "check"]
    );
}

#[test]
fn go_offers_run_only_beside_a_main_go() {
    let module = "module example.com/app\n\ngo 1.22\n";
    let library = folder("", &[("go.mod", module)]);
    assert_eq!(
        names(&found(&library, Platform::Unix), ScriptSource::Go),
        ["build", "test", "vet"]
    );

    let app = folder("", &[("go.mod", module), ("main.go", "")]);
    let scripts = found(&app, Platform::Unix);
    assert_eq!(one(&scripts, ScriptSource::Go, "run").command, "go run .");
    assert_eq!(
        one(&scripts, ScriptSource::Go, "build").package,
        "example.com/app"
    );
}
