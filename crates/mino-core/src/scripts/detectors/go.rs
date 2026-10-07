//! Go: the toolchain's own commands, where a `go.mod` is, and the modules a
//! `go.work` uses.

use crate::types::ScriptSource;

use super::super::model::{present, Candidate, Detector, Folder, Scope};
use super::fixed;

pub const GO: Detector = Detector {
    source: ScriptSource::Go,
    reads,
    lists: &[],
    detect,
    members,
};

const MODULE: &str = "go.mod";
const WORK: &str = "go.work";

fn reads(folder: &Folder) -> Vec<String> {
    present(folder, &[MODULE, WORK])
}

fn detect(scope: &Scope) -> Vec<Candidate> {
    let Some(text) = scope.folder.text(MODULE) else {
        return Vec::new();
    };
    let module = text
        .lines()
        .find_map(|line| line.trim().strip_prefix("module "))
        .map(|name| name.trim().trim_matches('"').to_string());

    let mut commands: Vec<(&str, &'static [&'static str])> =
        vec![("build", &["go", "build", "./..."])];
    // `go run .` needs a main package here; a main.go is the cheap sign of one.
    if scope.folder.has("main.go") {
        commands.push(("run", &["go", "run", "."]));
    }
    commands.push(("test", &["go", "test", "./..."]));
    commands.push(("vet", &["go", "vet", "./..."]));
    commands
        .into_iter()
        .map(|(name, argv)| Candidate::new(name, fixed(argv)).package(module.clone()))
        .collect()
}

fn members(scope: &Scope) -> Vec<String> {
    scope.folder.text(WORK).map(work_uses).unwrap_or_default()
}

/// The paths in `use ./x` lines and `use ( ... )` blocks.
pub fn work_uses(text: &str) -> Vec<String> {
    let mut found = Vec::new();
    let mut block = false;
    for line in text.lines() {
        let line = line.split("//").next().unwrap_or_default().trim();
        if block {
            if line == ")" {
                block = false;
            } else if !line.is_empty() {
                found.push(line.trim_matches('"').to_string());
            }
            continue;
        }
        match line.strip_prefix("use") {
            Some(rest) if rest.trim() == "(" => block = true,
            Some(rest) if rest.starts_with([' ', '\t']) => {
                found.push(rest.trim().trim_matches('"').to_string());
            }
            _ => {}
        }
    }
    found
}
