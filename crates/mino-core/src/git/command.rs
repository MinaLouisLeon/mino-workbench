//! The argv every git call is made from.
//!
//! SECURITY: nothing in this file builds a shell string, and no caller value
//! is ever spliced into one. Each function returns a fixed array of program
//! text; the only caller-influenced value in a git call is the working
//! directory, which the local transport passes to `Command::current_dir` and
//! the SSH transport single-quotes through `ssh::command::quote` - which
//! refuses a value it cannot quote safely rather than escaping it.
//!
//! This is the same rule `StructuredRequest` follows for Nushell: pipeline
//! text is fixed, caller values are bound as parameters. Here there are no
//! caller values at all.

pub const GIT_PROGRAM: &str = "git";

/// Wall-clock ceiling for one git call. Long enough for a cold status on a
/// large repository, short enough that a wedged git never becomes a hang.
pub const DEFAULT_TIMEOUT_MS: u64 = 15_000;

/// Options that go *before* the subcommand, so they are git's and not the
/// subcommand's.
///
/// `--no-optional-locks` keeps a status from refreshing the index on disk.
/// Status runs whenever a file is saved or the window regains focus, and a
/// background process taking the index lock is how a workbench ends up
/// fighting a terminal the user is typing `git commit` into.
const GLOBAL: &[&str] = &["--no-optional-locks"];

/// `git rev-parse --show-toplevel`: the work tree root, or exit 128 when the
/// directory is not inside a repository. That failure is the *answer* to
/// "is this a repository", not an error - see [`super::not_a_repository`].
pub fn repository_argv() -> Vec<&'static str> {
    let mut argv = GLOBAL.to_vec();
    argv.extend_from_slice(&["rev-parse", "--show-toplevel"]);
    argv
}

/// The one status call the whole phase is served by.
///
/// - `--porcelain=v2` is a documented, versioned format, not scraped human
///   text, and unlike v1 it carries the branch, the upstream and the
///   ahead/behind counts in the same pass.
/// - `-z` makes records NUL-terminated, which is the only way a filename
///   containing a newline or a quote survives intact.
/// - `--untracked-files=all` lists files inside an untracked directory
///   individually, because the tree decorates files and not just folders.
/// - `--ignored=matching` reports a directory that matches an ignore pattern
///   as one row instead of recursing into it, which is what keeps
///   `node_modules` from becoming forty thousand rows.
pub fn status_argv() -> Vec<&'static str> {
    let mut argv = GLOBAL.to_vec();
    argv.extend_from_slice(&[
        "status",
        "--porcelain=v2",
        "-z",
        "--branch",
        "--untracked-files=all",
        "--ignored=matching",
    ]);
    argv
}

/// The headers alone: branch, head, upstream and the ahead/behind counts.
///
/// `repository()` is asked on every connect, before anything is rendered, and
/// it does not need the file rows. Skipping the untracked walk turns a call
/// that can take a second on a large checkout into one that returns
/// immediately - and the headers come from a real status, so they cannot
/// disagree with the one the tree reads.
pub fn branch_argv() -> Vec<&'static str> {
    let mut argv = GLOBAL.to_vec();
    argv.extend_from_slice(&[
        "status",
        "--porcelain=v2",
        "-z",
        "--branch",
        "--untracked-files=no",
        "--ignored=no",
    ]);
    argv
}

/// The cheap half of a status, for the search walk's ignore predicate.
///
/// Search does not care what changed, only what git would not look at, so it
/// skips the branch headers and asks for `normal` rather than `all`, which
/// collapses each untracked directory into one row instead of listing its
/// contents. That is most of the cost of a status, and search runs this on
/// every query.
///
/// `--untracked-files=no` is not an option here even though it would be
/// cheaper still: git refuses that combination outright ("Unsupported
/// combination of ignored and untracked-files arguments"), because working out
/// what is ignored *is* the untracked walk.
pub fn ignored_argv() -> Vec<&'static str> {
    let mut argv = GLOBAL.to_vec();
    argv.extend_from_slice(&[
        "status",
        "--porcelain=v2",
        "-z",
        "--untracked-files=normal",
        "--ignored=matching",
    ]);
    argv
}

/// `git --version`, the probe. Cheap, and it answers the only question worth
/// asking up front: is there a usable git here at all.
pub fn version_argv() -> Vec<&'static str> {
    vec!["--version"]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn global_options_precede_the_subcommand() {
        let argv = status_argv();
        let lock = argv.iter().position(|a| *a == "--no-optional-locks");
        let status = argv.iter().position(|a| *a == "status");
        assert!(lock < status);
    }

    #[test]
    fn every_argument_is_fixed_program_text() {
        // The point of the file: no function here takes a caller value, so
        // there is nothing for a path or a branch name to be spliced into.
        for argv in [
            repository_argv(),
            status_argv(),
            branch_argv(),
            ignored_argv(),
            version_argv(),
        ] {
            assert!(argv
                .iter()
                .all(|arg| arg.starts_with('-') || arg.is_ascii()));
        }
    }
}
