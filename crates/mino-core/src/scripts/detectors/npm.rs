//! `package.json` scripts, run with whichever package manager the project uses.
//!
//! The manager is read, never guessed from what is installed: the
//! `packageManager` field first (Corepack's own source of truth), then the
//! lockfile, in the folder itself and then at the workspace root, because a
//! workspace member has no lockfile of its own. With neither, it is npm.

use serde_json::Value;

use crate::types::ScriptSource;

use super::super::model::{present, Candidate, Detector, Folder, Scope};
use super::{json, with_value};

pub const NPM: Detector = Detector {
    source: ScriptSource::Npm,
    reads,
    lists: &[],
    detect,
    members,
};

const MANIFEST: &str = "package.json";
const PNPM_WORKSPACE: &str = "pnpm-workspace.yaml";

fn reads(folder: &Folder) -> Vec<String> {
    present(folder, &[MANIFEST, PNPM_WORKSPACE])
}

fn manifest(folder: &Folder) -> Option<Value> {
    folder.text(MANIFEST).and_then(json::parse)
}

/// The `packageManager` field's tool, if it names one this knows.
fn declared(folder: &Folder) -> Option<&'static str> {
    let field = manifest(folder)?
        .get("packageManager")?
        .as_str()?
        .split('@')
        .next()?
        .to_string();
    ["pnpm", "yarn", "bun", "npm"]
        .into_iter()
        .find(|known| *known == field)
}

fn from_lockfile(folder: &Folder) -> Option<&'static str> {
    const LOCKS: &[(&str, &str)] = &[
        ("pnpm-lock.yaml", "pnpm"),
        ("yarn.lock", "yarn"),
        ("bun.lockb", "bun"),
        ("bun.lock", "bun"),
        ("package-lock.json", "npm"),
    ];
    LOCKS
        .iter()
        .find(|(lock, _)| folder.has(lock))
        .map(|(_, manager)| *manager)
}

pub fn manager(scope: &Scope) -> &'static str {
    declared(scope.folder)
        .or_else(|| from_lockfile(scope.folder))
        .or_else(|| declared(scope.root))
        .or_else(|| from_lockfile(scope.root))
        .unwrap_or("npm")
}

fn detect(scope: &Scope) -> Vec<Candidate> {
    let Some(value) = manifest(scope.folder) else {
        return Vec::new();
    };
    let manager = manager(scope);
    let package = json::name(&value);
    json::entries(value.get("scripts"))
        .into_iter()
        .map(|(name, body)| {
            Candidate::new(name.clone(), with_value(&[manager, "run"], &name))
                .command(body)
                .package(package.clone())
        })
        .collect()
}

fn members(scope: &Scope) -> Vec<String> {
    let mut patterns = manifest(scope.folder)
        .map(|value| json::strings(value.get("workspaces")))
        .unwrap_or_default();
    if let Some(text) = scope.folder.text(PNPM_WORKSPACE) {
        patterns.extend(pnpm_packages(text));
    }
    patterns
}

/// The `packages:` list of a `pnpm-workspace.yaml`. Read by line rather than
/// with a YAML parser: the file is that one list in practice, and this only
/// needs its strings.
pub fn pnpm_packages(text: &str) -> Vec<String> {
    let mut inside = false;
    let mut found = Vec::new();
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        if !line.starts_with([' ', '\t', '-']) {
            inside = trimmed == "packages:";
            continue;
        }
        if let (true, Some(item)) = (inside, trimmed.strip_prefix('-')) {
            let item = item.split(" #").next().unwrap_or_default().trim();
            found.push(item.trim_matches(['\'', '"']).to_string());
        }
    }
    found
}
