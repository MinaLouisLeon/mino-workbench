//! Makefile targets and justfile recipes.
//!
//! Both are read by line. Neither format can be parsed fully without running
//! its tool - make expands variables into target names, just has imports and
//! modules - so this lists what is written down literally and leaves the rest
//! out rather than guessing at it.

use crate::types::ScriptSource;

use super::super::model::{no_members, Candidate, Detector, Folder, Scope};
use super::with_value;

pub const MAKE: Detector = Detector {
    source: ScriptSource::Make,
    reads: make_reads,
    lists: &[],
    detect: make_detect,
    members: no_members,
};

pub const JUST: Detector = Detector {
    source: ScriptSource::Just,
    reads: just_reads,
    lists: &[],
    detect: just_detect,
    members: no_members,
};

const MAKEFILES: &[&str] = &["GNUmakefile", "makefile", "Makefile"];
const JUSTFILES: &[&str] = &["justfile", "Justfile", ".justfile"];

fn make_reads(folder: &Folder) -> Vec<String> {
    folder
        .first_of(MAKEFILES)
        .map(str::to_string)
        .into_iter()
        .collect()
}

fn just_reads(folder: &Folder) -> Vec<String> {
    folder
        .first_of(JUSTFILES)
        .map(str::to_string)
        .into_iter()
        .collect()
}

fn make_detect(scope: &Scope) -> Vec<Candidate> {
    let Some(text) = scope
        .folder
        .first_of(MAKEFILES)
        .and_then(|f| scope.folder.text(f))
    else {
        return Vec::new();
    };
    make_targets(text)
        .into_iter()
        .map(|target| Candidate::new(target.clone(), with_value(&["make"], &target)))
        .collect()
}

/// Explicit targets, in the order written. Special targets (`.PHONY`), pattern
/// rules (`%.o`), variable assignments and anything with a `$` in it are not.
pub fn make_targets(text: &str) -> Vec<String> {
    let mut found: Vec<String> = Vec::new();
    for line in text.lines() {
        if line.starts_with(|c: char| c.is_whitespace() || c == '#' || c == '.') {
            continue;
        }
        let Some((targets, rest)) = line.split_once(':') else {
            continue;
        };
        if rest.starts_with('=') || targets.contains(['=', '$', '%', '(']) {
            continue;
        }
        for target in targets.split_whitespace() {
            if !found.iter().any(|seen| seen == target) {
                found.push(target.to_string());
            }
        }
    }
    found
}

fn just_detect(scope: &Scope) -> Vec<Candidate> {
    let Some(text) = scope
        .folder
        .first_of(JUSTFILES)
        .and_then(|f| scope.folder.text(f))
    else {
        return Vec::new();
    };
    just_recipes(text)
        .into_iter()
        .map(|recipe| Candidate::new(recipe.clone(), with_value(&["just"], &recipe)))
        .collect()
}

/// Recipe names. Settings, aliases, imports and assignments are not recipes,
/// and a recipe starting with `_` is private by just's own convention.
pub fn just_recipes(text: &str) -> Vec<String> {
    const KEYWORDS: &[&str] = &["set", "alias", "export", "import", "mod", "if", "else"];
    let mut found: Vec<String> = Vec::new();
    for line in text.lines() {
        if line.starts_with(|c: char| c.is_whitespace() || c == '#' || c == '[') {
            continue;
        }
        let body = line.trim_start_matches('@');
        let name: String = body
            .chars()
            .take_while(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-')
            .collect();
        let rest = &body[name.len()..];
        let Some(colon) = rest.find(':') else {
            continue;
        };
        let assignment = rest[colon..].starts_with(":=") || rest[..colon].contains(":=");
        if name.is_empty()
            || name.starts_with('_')
            || assignment
            || KEYWORDS.contains(&name.as_str())
        {
            continue;
        }
        if !found.contains(&name) {
            found.push(name);
        }
    }
    found
}
