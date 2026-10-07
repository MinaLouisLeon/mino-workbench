//! `deno.json` / `deno.jsonc` tasks, run with `deno task`, and the members of
//! a Deno workspace.

use serde_json::Value;

use crate::types::ScriptSource;

use super::super::model::{Candidate, Detector, Folder, Scope};
use super::{json, with_value};

pub const DENO: Detector = Detector {
    source: ScriptSource::Deno,
    reads,
    lists: &[],
    detect,
    members,
};

const MANIFESTS: &[&str] = &["deno.json", "deno.jsonc"];

fn reads(folder: &Folder) -> Vec<String> {
    folder
        .first_of(MANIFESTS)
        .map(str::to_string)
        .into_iter()
        .collect()
}

fn manifest(folder: &Folder) -> Option<Value> {
    folder
        .first_of(MANIFESTS)
        .and_then(|name| folder.text(name))
        .and_then(json::parse)
}

fn detect(scope: &Scope) -> Vec<Candidate> {
    let Some(value) = manifest(scope.folder) else {
        return Vec::new();
    };
    let package = json::name(&value);
    json::entries(value.get("tasks"))
        .into_iter()
        .map(|(name, body)| {
            Candidate::new(name.clone(), with_value(&["deno", "task"], &name))
                .command(body)
                .package(package.clone())
        })
        .collect()
}

fn members(scope: &Scope) -> Vec<String> {
    manifest(scope.folder)
        .map(|value| json::strings(value.get("workspace")))
        .unwrap_or_default()
}
