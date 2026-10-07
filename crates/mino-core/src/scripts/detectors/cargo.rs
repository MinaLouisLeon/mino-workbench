//! Cargo: the toolchain's own commands, where a `Cargo.toml` is.
//!
//! Cargo has no script table, so these are the four commands every crate
//! answers. `run` is offered only where there is something to run - a
//! `src/main.rs` or a `[[bin]]` - and a virtual workspace (no `[package]`)
//! gets the three that work across all its members.

use toml::Table;

use crate::types::ScriptSource;

use super::super::model::{present, Candidate, Detector, Folder, Scope};
use super::fixed;

pub const CARGO: Detector = Detector {
    source: ScriptSource::Cargo,
    reads,
    lists: &["src"],
    detect,
    members,
};

const MANIFEST: &str = "Cargo.toml";

fn reads(folder: &Folder) -> Vec<String> {
    present(folder, &[MANIFEST])
}

pub fn manifest(folder: &Folder) -> Option<Table> {
    folder.text(MANIFEST)?.parse::<Table>().ok()
}

fn detect(scope: &Scope) -> Vec<Candidate> {
    let Some(table) = manifest(scope.folder) else {
        return Vec::new();
    };
    let package = table
        .get("package")
        .and_then(|p| p.get("name"))
        .and_then(|n| n.as_str())
        .map(str::to_string);
    if package.is_none() && !table.contains_key("workspace") {
        return Vec::new();
    }

    let has_main = scope
        .folder
        .children
        .get("src")
        .is_some_and(|names| names.contains("main.rs"));
    let runnable = package.is_some() && (has_main || table.contains_key("bin"));

    let mut commands: Vec<(&str, &'static [&'static str])> = vec![("build", &["cargo", "build"])];
    if runnable {
        commands.push(("run", &["cargo", "run"]));
    }
    commands.push(("test", &["cargo", "test"]));
    commands.push(("check", &["cargo", "check"]));
    commands
        .into_iter()
        .map(|(name, argv)| Candidate::new(name, fixed(argv)).package(package.clone()))
        .collect()
}

fn members(scope: &Scope) -> Vec<String> {
    let Some(table) = manifest(scope.folder) else {
        return Vec::new();
    };
    table
        .get("workspace")
        .and_then(|w| w.get("members"))
        .and_then(|m| m.as_array())
        .map(|items| {
            items
                .iter()
                .filter_map(|i| i.as_str())
                .map(str::to_string)
                .collect()
        })
        .unwrap_or_default()
}
