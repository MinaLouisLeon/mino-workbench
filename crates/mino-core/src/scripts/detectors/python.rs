//! `pyproject.toml`: entry points, and the task tables of the tools that keep
//! them there.
//!
//! An entry point (`[project.scripts]`, `[tool.poetry.scripts]`) is a command
//! installed into the project's environment, so it is run through whichever
//! environment manager the project uses - `uv run`, `poetry run`, `pdm run` -
//! read from its lockfile. With none, it is run by name and assumed to be on
//! PATH, which is true inside an activated virtualenv.
//!
//! The task tables are each run by their own tool: `pdm run`, `poe`, `hatch
//! run`. Where to find them is in [`super::python_tables`].

use toml::Table;

use crate::types::ScriptSource;

use super::super::model::{present, Arg, Candidate, Detector, Folder, Scope};
use super::python_tables::{entry_points, task_tables};

pub const PYTHON: Detector = Detector {
    source: ScriptSource::Python,
    reads,
    lists: &[],
    detect,
    members,
};

const MANIFEST: &str = "pyproject.toml";

fn reads(folder: &Folder) -> Vec<String> {
    present(folder, &[MANIFEST])
}

fn manifest(folder: &Folder) -> Option<Table> {
    folder.text(MANIFEST)?.parse::<Table>().ok()
}

/// The environment manager, from a lockfile here or at the workspace root.
fn environment(scope: &Scope, table: &Table) -> &'static [&'static str] {
    let has = |name: &str| scope.folder.has(name) || scope.root.has(name);
    if has("uv.lock") {
        &["uv", "run"]
    } else if has("poetry.lock") || dig(table, &["tool", "poetry"]).is_some() {
        &["poetry", "run"]
    } else if has("pdm.lock") {
        &["pdm", "run"]
    } else {
        &[]
    }
}

/// Walks nested tables by key.
pub fn dig<'a>(table: &'a Table, path: &[&str]) -> Option<&'a toml::Value> {
    let (first, rest) = path.split_first()?;
    let mut value = table.get(*first)?;
    for key in rest {
        value = value.get(*key)?;
    }
    Some(value)
}

fn detect(scope: &Scope) -> Vec<Candidate> {
    let Some(table) = manifest(scope.folder) else {
        return Vec::new();
    };
    let package = dig(&table, &["project", "name"])
        .or_else(|| dig(&table, &["tool", "poetry", "name"]))
        .and_then(|v| v.as_str())
        .map(str::to_string);
    let prefix = environment(scope, &table);

    let mut found: Vec<Candidate> = Vec::new();
    for (name, target) in entry_points(&table) {
        let mut argv: Vec<Arg> = prefix.iter().map(|part| Arg::Fixed(part)).collect();
        argv.push(Arg::Value(name.clone()));
        found.push(Candidate::new(name, argv).command(target));
    }
    for (runner, name, body) in task_tables(&table, prefix) {
        let mut argv: Vec<Arg> = runner.iter().map(|part| Arg::Fixed(part)).collect();
        argv.push(Arg::Value(name.clone()));
        found.push(Candidate::new(name, argv).command(body));
    }
    found
        .into_iter()
        .map(|candidate| candidate.package(package.clone()))
        .collect()
}

fn members(scope: &Scope) -> Vec<String> {
    manifest(scope.folder)
        .and_then(|table| {
            dig(&table, &["tool", "uv", "workspace", "members"])
                .and_then(|m| m.as_array())
                .map(|items| {
                    items
                        .iter()
                        .filter_map(|i| i.as_str())
                        .map(str::to_string)
                        .collect()
                })
        })
        .unwrap_or_default()
}
