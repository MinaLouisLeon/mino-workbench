//! Running a script, then leaving a shell behind.
//!
//! The script's argv never becomes shell text. Each launcher below is fixed
//! program text that reads the argv from somewhere a shell does not parse:
//!
//! - **POSIX** (local and SSH): `sh -c SH_RUN shell argv...`. The argv arrive
//!   as positional parameters and run as `"$@"`; `$0` is the shell to `exec`
//!   into once the script ends.
//! - **Windows, Nushell**: `nu -e NU_RUN`, with the argv as JSON in
//!   `MINO_RUN_ARGV` - the same `$env.MINO_*` rule every pipeline follows.
//! - **Windows, PowerShell**: `-NoExit -Command PS_RUN`, the same way.
//!
//! `cmd.exe` is the one shell refused. It re-parses whatever it is given, and
//! a terminal that has fallen back to it has no PowerShell either.
//!
//! In every case `Ctrl+C` stops the script and not the terminal: `sh` traps
//! `INT` for the duration, and Nushell and PowerShell return to the prompt.

use crate::error::{Result, TransportError};
use crate::shell::fallback_label;
use crate::types::ShellKind;

use super::model::Platform;

/// Must hold no single quote: over SSH it is single-quoted onto the line.
pub const SH_RUN: &str =
    r#"trap : INT; printf "\033[2m> %s\033[0m\n" "$*"; "$@"; trap - INT; exec "$0""#;

/// Must hold no double quote, so Windows argument quoting passes it intact.
pub const NU_RUN: &str =
    "let mino_run = ($env.MINO_RUN_ARGV | from json); hide-env MINO_RUN_ARGV; \
print $'(ansi dark_gray)> ($mino_run | str join (char space))(ansi reset)'; \
run-external ($mino_run | first) ...($mino_run | skip 1)";

/// Resolves the program as an application first, so `npm` finds `npm.cmd`
/// rather than an `npm.ps1` an execution policy would refuse.
pub const PS_RUN: &str = "$minoRun = @(foreach ($x in ($env:MINO_RUN_ARGV | ConvertFrom-Json)) { $x }); \
Remove-Item Env:MINO_RUN_ARGV; \
Write-Host ('> ' + ($minoRun -join ' ')) -ForegroundColor DarkGray; \
$minoArgs = @($minoRun | Select-Object -Skip 1); \
$minoExe = Get-Command $minoRun[0] -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1; \
if ($minoExe) { & $minoExe.Source @minoArgs } else { & $minoRun[0] @minoArgs }";

pub const ARGV_ENV: &str = "MINO_RUN_ARGV";
const POSIX_SH: &str = "/bin/sh";

/// A process to spawn in a local pty.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Launch {
    pub program: String,
    pub args: Vec<String>,
    pub env: Vec<(String, String)>,
}

impl Launch {
    /// The shell on its own, as every terminal without a script starts.
    pub fn shell(program: &str) -> Self {
        Self {
            program: program.to_string(),
            args: Vec::new(),
            env: Vec::new(),
        }
    }
}

/// How to start `shell` so that it runs `argv` first.
pub fn local(shell: &str, kind: ShellKind, platform: Platform, argv: &[String]) -> Result<Launch> {
    if platform == Platform::Unix {
        let mut args = vec!["-c".to_string(), SH_RUN.to_string(), shell.to_string()];
        args.extend(argv.iter().cloned());
        return Ok(Launch {
            program: POSIX_SH.to_string(),
            args,
            env: Vec::new(),
        });
    }

    let json = serde_json::to_string(argv)
        .map_err(|e| TransportError::invalid(format!("could not encode the script: {e}")))?;
    let env = vec![(ARGV_ENV.to_string(), json)];
    let args: &[&str] = match kind {
        ShellKind::Nu => &["-e", NU_RUN],
        ShellKind::Fallback => match fallback_label(shell).to_ascii_lowercase().as_str() {
            "powershell" | "pwsh" => &["-NoExit", "-Command", PS_RUN],
            other => {
                return Err(TransportError::shell(format!(
                "running a script needs Nushell or PowerShell, and this terminal would be {other}"
            )))
            }
        },
    };
    Ok(Launch {
        program: shell.to_string(),
        args: args.iter().map(|a| a.to_string()).collect(),
        env,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_texts_survive_the_quoting_they_travel_through() {
        assert!(!SH_RUN.contains('\''));
        assert!(!NU_RUN.contains('"'));
        assert!(!PS_RUN.contains('"'));
    }

    #[test]
    fn posix_passes_the_argv_as_parameters() {
        let argv = vec!["npm".to_string(), "run".to_string(), "dev".to_string()];
        let launch = local("/usr/bin/nu", ShellKind::Nu, Platform::Unix, &argv).unwrap();
        assert_eq!(launch.program, "/bin/sh");
        assert_eq!(launch.args[2], "/usr/bin/nu");
        assert_eq!(&launch.args[3..], &argv[..]);
        assert!(launch.env.is_empty());
    }

    #[test]
    fn windows_passes_the_argv_in_the_environment() {
        let argv = vec!["npm".to_string(), "run".to_string(), "dev".to_string()];
        let launch = local("nu.exe", ShellKind::Nu, Platform::Windows, &argv).unwrap();
        assert_eq!(launch.args, vec!["-e".to_string(), NU_RUN.to_string()]);
        assert_eq!(launch.env[0].1, r#"["npm","run","dev"]"#);
        let ps = local(
            "powershell.exe",
            ShellKind::Fallback,
            Platform::Windows,
            &argv,
        )
        .unwrap();
        assert_eq!(ps.args[0], "-NoExit");
        assert!(local("cmd.exe", ShellKind::Fallback, Platform::Windows, &argv).is_err());
    }
}
