//! go-task's `Taskfile.yml`.
//!
//! Read by line, like the pnpm workspace file: the task names are the keys one
//! level under `tasks:`, and that is all the menu needs from it. Included
//! Taskfiles are namespaced by `task` itself and are not followed here.

use crate::types::ScriptSource;

use super::super::model::{no_members, Candidate, Detector, Folder, Scope};
use super::with_value;

pub const TASK: Detector = Detector {
    source: ScriptSource::Task,
    reads,
    lists: &[],
    detect,
    members: no_members,
};

const TASKFILES: &[&str] = &[
    "Taskfile.yml",
    "taskfile.yml",
    "Taskfile.yaml",
    "taskfile.yaml",
    "Taskfile.dist.yml",
    "taskfile.dist.yml",
];

fn reads(folder: &Folder) -> Vec<String> {
    folder
        .first_of(TASKFILES)
        .map(str::to_string)
        .into_iter()
        .collect()
}

fn detect(scope: &Scope) -> Vec<Candidate> {
    let Some(text) = scope
        .folder
        .first_of(TASKFILES)
        .and_then(|f| scope.folder.text(f))
    else {
        return Vec::new();
    };
    task_names(text)
        .into_iter()
        .map(|name| Candidate::new(name.clone(), with_value(&["task"], &name)))
        .collect()
}

pub fn task_names(text: &str) -> Vec<String> {
    let mut inside = false;
    let mut indent: Option<usize> = None;
    let mut found = Vec::new();
    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        let lead = line.len() - line.trim_start().len();
        if lead == 0 {
            inside = trimmed == "tasks:";
            indent = None;
            continue;
        }
        if !inside || lead != *indent.get_or_insert(lead) {
            continue;
        }
        let key = match trimmed.strip_suffix(':') {
            Some(key) => key,
            None => trimmed
                .split_once(": ")
                .map(|(key, _)| key)
                .unwrap_or_default(),
        };
        let key = key.trim_matches(['\'', '"']);
        if !key.is_empty() {
            found.push(key.to_string());
        }
    }
    found
}
