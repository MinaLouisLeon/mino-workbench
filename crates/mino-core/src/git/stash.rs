//! Reading `git stash list`, and reading a refusal to move a stash.
//!
//! Git describes a stash entry in one line of reflog text:
//!
//! ```text
//! stash@{0}<US>WIP on main: 3f2a1c9 first<US>1788024729
//! stash@{1}<US>On dev: half a refactor<US>1788024000
//! ```
//!
//! Two things have to come out of the middle field. The **branch** it was made
//! on, which git prefixes, and the **message**, which is either what the user
//! wrote or the commit summary git chose. Splitting them here rather than in
//! the UI is what keeps a stash row from re-showing the branch it is already
//! grouped under.
//!
//! The **index** is read from `%gd` rather than counted from the row's
//! position. They agree today; they are still two different facts, and the one
//! a later `drop` will be given is the selector git printed.

use crate::error::{Result, TransportError};
use crate::types::GitStash;

use super::GitOutput;

const UNIT: char = '\u{1f}';
const FIELDS: usize = 3;

/// Git's two subject prefixes. `WIP on` is what it writes for a stash with no
/// message; `On` is what it writes when the user supplied one.
const PREFIXES: [&str; 2] = ["WIP on ", "On "];

/// The stack, most recent first - git's own order, which is also the order the
/// indices run in.
pub fn parse(output: &GitOutput) -> Result<Vec<GitStash>> {
    if !output.succeeded() {
        return Err(TransportError::shell(output.message("stash list")));
    }
    Ok(output
        .stdout
        .split('\0')
        .filter(|record| !record.trim().is_empty())
        .filter_map(row)
        .collect())
}

fn row(record: &str) -> Option<GitStash> {
    let fields: Vec<&str> = record.trim_start_matches('\n').split(UNIT).collect();
    if fields.len() < FIELDS {
        return None;
    }
    let (branch, message) = subject(fields[1]);
    Some(GitStash {
        index: index(fields[0])?,
        message,
        branch,
        timestamp_ms: fields[2]
            .trim()
            .parse::<u64>()
            .unwrap_or(0)
            .saturating_mul(1_000),
    })
}

/// `stash@{2}` becomes `2`. A selector that does not parse drops the row
/// rather than defaulting to zero: zero is a real entry, and acting on the
/// wrong one is the mistake this whole module is arranged to avoid.
fn index(selector: &str) -> Option<u32> {
    selector
        .trim()
        .strip_prefix("stash@{")?
        .strip_suffix('}')?
        .parse()
        .ok()
}

/// Splits git's reflog subject into the branch and the message.
///
/// A branch name cannot contain `:` - `check-ref-format` refuses it - so the
/// first `: ` after the prefix is unambiguously the boundary, and a message
/// containing a colon survives intact.
fn subject(text: &str) -> (Option<String>, String) {
    for prefix in PREFIXES {
        let Some(rest) = text.strip_prefix(prefix) else {
            continue;
        };
        let Some((branch, message)) = rest.split_once(": ") else {
            continue;
        };
        return (Some(branch.to_string()), message.trim().to_string());
    }
    // Git wrote something this does not recognise. The whole subject is still
    // the most useful thing to show, so it becomes the message rather than
    // the row becoming blank.
    (None, text.trim().to_string())
}

/// Turns a failed stash call into the sentence worth showing.
///
/// The conflict case is the one that matters: `pop` leaves the entry on the
/// stack when it conflicts, so the reader has to be told the work is still
/// there. Full conflict resolution is phase 6; saying where things stand is
/// this phase's job.
pub fn failure(output: &GitOutput, what: &str) -> TransportError {
    let combined = format!("{} {}", output.stdout, output.stderr).to_lowercase();

    if combined.contains("conflict") || combined.contains("could not restore untracked files") {
        return TransportError::invalid(
            "the stash could not be applied cleanly - it conflicts with the working \
             tree. The entry is still on the stack, and the conflicting files are \
             marked in the working tree.",
        );
    }
    if combined.contains("is not a valid reference")
        || combined.contains("is not a stash")
        || combined.contains("no stash entries found")
        || combined.contains("log for 'refs/stash' only has")
    {
        return TransportError::invalid(
            "that stash entry is no longer there. The list has been re-read.",
        );
    }
    if combined.contains("no local changes to save") {
        return TransportError::invalid(
            "there is nothing to stash: the working tree matches the last commit.",
        );
    }
    TransportError::shell(output.message(what))
}

#[cfg(test)]
mod tests;
