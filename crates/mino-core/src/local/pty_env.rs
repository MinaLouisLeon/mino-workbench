//! The environment a pty's child starts with.

use portable_pty::CommandBuilder;

use crate::scripts::launch::Launch;

/// Matches what the SSH transport requests, so a shell behaves the same on
/// either transport.
const TERM_NAME: &str = "xterm-256color";

/// What the child is told about the terminal it is attached to.
///
/// A child inherits this process's environment, and that is the wrong default
/// for a terminal emulator: whatever launched the app decides whether `nu`,
/// `claude` or `git` print in colour. Two cases bite in practice - a parent
/// with no `TERM` at all (normal on Windows) and a parent carrying
/// `NO_COLOR`, which is honoured by most modern CLI tools and turns the pane
/// monochrome for reasons the user cannot see.
///
/// So the pty declares its own terminal, exactly as any other emulator does.
/// xterm.js renders 256 colours and true colour, so it is honest to say so.
fn apply_terminal_env(command: &mut CommandBuilder) {
    command.env("TERM", TERM_NAME);
    command.env("COLORTERM", "truecolor");
    // Inherited opt-outs. The pane is colour-capable regardless of how the
    // app itself was started, so these are cleared rather than passed on.
    command.env_remove("NO_COLOR");
    command.env_remove("CLICOLOR_FORCE");
}

/// The terminal's own variables, then the launcher's. The launcher's are only
/// ever a script's argv, as JSON, for it to read - see
/// `crate::scripts::launch`.
pub fn apply_env(command: &mut CommandBuilder, launch: &Launch) {
    apply_terminal_env(command);
    for (key, value) in &launch.env {
        command.env(key, value);
    }
}
