//! Where in a `pyproject.toml` each tool keeps its scripts.

use toml::{Table, Value};

use super::python::dig;

/// `(name, "module:function")` from `[project.scripts]` and
/// `[tool.poetry.scripts]`.
pub fn entry_points(table: &Table) -> Vec<(String, String)> {
    let mut found = Vec::new();
    for path in [
        &["project", "scripts"][..],
        &["tool", "poetry", "scripts"][..],
    ] {
        let Some(Value::Table(scripts)) = dig(table, path) else {
            continue;
        };
        for (name, target) in scripts {
            if let Some(text) = describe(target) {
                found.push((name.clone(), text));
            }
        }
    }
    found
}

/// `(runner, name, what it runs)` for every task-runner table present.
///
/// `poe` is run inside the project's environment when there is one, because
/// it is usually installed there rather than globally.
pub fn task_tables(
    table: &Table,
    environment: &'static [&'static str],
) -> Vec<(&'static [&'static str], String, String)> {
    let poe: &'static [&'static str] = match environment {
        ["uv", "run"] => &["uv", "run", "poe"],
        ["poetry", "run"] => &["poetry", "run", "poe"],
        ["pdm", "run"] => &["pdm", "run", "poe"],
        _ => &["poe"],
    };
    let tables: [(&[&str], &'static [&'static str]); 3] = [
        (&["tool", "pdm", "scripts"], &["pdm", "run"]),
        (&["tool", "poe", "tasks"], poe),
        (
            &["tool", "hatch", "envs", "default", "scripts"],
            &["hatch", "run"],
        ),
    ];

    let mut found = Vec::new();
    for (path, runner) in tables {
        let Some(Value::Table(tasks)) = dig(table, path) else {
            continue;
        };
        for (name, task) in tasks {
            // `[tool.pdm.scripts._]` holds settings shared by every script.
            if name == "_" {
                continue;
            }
            if let Some(text) = describe(task) {
                found.push((runner, name.clone(), text));
            }
        }
    }
    found
}

/// What one entry runs: a string, a list of strings, or a table naming its
/// command under one of the keys these tools use.
fn describe(value: &Value) -> Option<String> {
    const KEYS: &[&str] = &[
        "cmd",
        "shell",
        "call",
        "script",
        "ref",
        "composite",
        "sequence",
        "reference",
        "callable",
    ];
    match value {
        Value::String(text) => Some(text.clone()),
        Value::Array(items) => Some(
            items
                .iter()
                .filter_map(describe)
                .collect::<Vec<_>>()
                .join(" && "),
        ),
        Value::Table(map) => KEYS.iter().find_map(|key| map.get(*key)).and_then(describe),
        _ => None,
    }
}
