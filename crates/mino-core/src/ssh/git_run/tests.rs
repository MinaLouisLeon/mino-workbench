//! How an argv array becomes one remote command line.
//!
//! Every argument is quoted, so a path containing a space stays one argument
//! and a path containing a semicolon stays a path. A single quote is refused
//! rather than escaped, which is the documented limit of this transport.

use super::*;
use crate::git::command;

fn owned(args: &[&str]) -> Vec<String> {
    args.iter().map(|a| (*a).to_string()).collect()
}

#[test]
fn every_argument_is_quoted_not_just_the_directory() {
    let line = command_line("/srv/app", &owned(&command::status_argv())).unwrap();
    assert!(line.starts_with("cd '/srv/app' && git "));
    assert!(line.contains("'--porcelain=v2'"));
}

#[test]
fn a_quote_in_the_remote_path_is_refused_not_escaped() {
    assert!(command_line("/srv/it's", &owned(&command::status_argv())).is_err());
}

#[test]
fn a_path_with_a_space_stays_one_argument() {
    let line = command_line(
        "/srv/app",
        &command::stage_argv(&["release notes.md".to_string()]),
    )
    .unwrap();
    assert!(line.ends_with("'--' 'release notes.md'"), "{line}");
}

#[test]
fn a_shell_metacharacter_in_a_path_is_inert() {
    // Quoted, so the remote shell reads it as a filename. The path guard
    // has already refused anything outside the root; this is the second
    // line of defence, not the first.
    let line = command_line(
        "/srv/app",
        &command::stage_argv(&["; rm -rf /".to_string()]),
    )
    .unwrap();
    assert!(line.ends_with("'--' '; rm -rf /'"), "{line}");
}
