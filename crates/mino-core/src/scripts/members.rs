//! Turning a workspace's member patterns into folders.
//!
//! Every ecosystem spells this differently - npm's `workspaces`, Cargo's
//! `members`, `go.work`'s `use` - but the patterns themselves are nearly
//! always one of two shapes: a literal folder, or a folder of folders
//! (`packages/*`). Those two are supported, plus a wildcard anywhere in the
//! last segment (`apps/web-*`). A wildcard earlier in the path is skipped
//! rather than walked, because the scan is meant to be a handful of reads,
//! and a `**` in the last segment is read as `*` for the same reason.
//!
//! A leading `!` excludes, as it does in npm and pnpm.

use super::safe::safe_dir;
use super::source::{join, list, ScanSource};

/// Folders that are never a workspace member, whatever a glob says.
const NEVER: &[&str] = &["node_modules", "target", ".git", "vendor", "dist", "build"];

/// Strips `./` and trailing separators, and refuses a pattern that could
/// leave the folder it was declared in.
fn normalise(pattern: &str) -> Option<String> {
    let trimmed = pattern
        .trim()
        .trim_start_matches("./")
        .trim_end_matches('/');
    let trimmed = match trimmed.strip_suffix("/**") {
        Some(rest) => format!("{rest}/*"),
        None => trimmed.to_string(),
    };
    let checked = trimmed.replace('*', "x");
    if trimmed.is_empty() || trimmed == "." || !safe_dir(&checked) {
        return None;
    }
    Some(trimmed)
}

/// `*` matches any run of characters, including none.
pub fn wildcard(pattern: &str, name: &str) -> bool {
    match pattern.split_once('*') {
        None => pattern == name,
        Some((head, tail)) => {
            let Some(rest) = name.strip_prefix(head) else {
                return false;
            };
            (0..=rest.len())
                .filter(|cut| rest.is_char_boundary(*cut))
                .any(|cut| wildcard(tail, &rest[cut..]))
        }
    }
}

/// Every folder `patterns` names under `base`, relative to the root, in the
/// order found and without duplicates.
pub async fn expand(source: &dyn ScanSource, base: &str, patterns: &[String]) -> Vec<String> {
    let mut include = Vec::new();
    let mut exclude = Vec::new();
    for raw in patterns {
        match raw.trim().strip_prefix('!') {
            Some(negated) => exclude.extend(normalise(negated)),
            None => include.extend(normalise(raw)),
        }
    }

    let mut found: Vec<String> = Vec::new();
    for pattern in include {
        let (parent, last) = match pattern.rsplit_once('/') {
            Some((parent, last)) => (parent.to_string(), last.to_string()),
            None => (String::new(), pattern.clone()),
        };
        if parent.contains('*') {
            continue;
        }
        let candidates = if last.contains('*') {
            let Ok((_, dirs)) = list(source, &join(base, &parent)).await else {
                continue;
            };
            dirs.into_iter()
                .filter(|dir| !dir.starts_with('.') && !NEVER.contains(&dir.as_str()))
                .filter(|dir| wildcard(&last, dir))
                .map(|dir| join(&parent, &dir))
                .collect()
        } else {
            vec![pattern.clone()]
        };
        for relative in candidates {
            let excluded = exclude.iter().any(|ex| wildcard(ex, &relative));
            let full = join(base, &relative);
            if !excluded && !found.contains(&full) {
                found.push(full);
            }
        }
    }
    found
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wildcards_match_within_a_segment() {
        assert!(wildcard("*", "web"));
        assert!(wildcard("web-*", "web-admin"));
        assert!(!wildcard("web-*", "api"));
        assert!(wildcard("*-app", "mobile-app"));
    }

    #[test]
    fn patterns_cannot_leave_their_folder() {
        assert_eq!(normalise("./packages/*/"), Some("packages/*".to_string()));
        assert_eq!(normalise("crates/**"), Some("crates/*".to_string()));
        assert_eq!(normalise("../outside"), None);
        assert_eq!(normalise("/abs"), None);
        assert_eq!(normalise("."), None);
    }
}
