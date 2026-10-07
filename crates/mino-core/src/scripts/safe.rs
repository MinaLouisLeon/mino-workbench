//! Which values from a manifest may become an argv element.
//!
//! A script name is written by whoever wrote the repository, and it ends up in
//! front of a shell: `cmd.exe` parses the arguments of every `.cmd` shim
//! (`npm.cmd`, `pnpm.cmd`), and over SSH the argv is single-quoted onto a
//! command line. Escaping correctly for all of those at once is a known way to
//! get it wrong, so this does not escape at all. It allows a small alphabet
//! that means the same thing to every one of them, and a script outside it is
//! counted in `ScriptCatalog::skipped` rather than run.
//!
//! A leading `-` is refused too: a make target called `--eval=...` would be
//! read as an option by the program rather than as a name.

/// Long enough for any real script name or relative path.
const MAX_VALUE_LEN: usize = 200;

/// Characters with no meaning to `sh`, `cmd.exe`, PowerShell or Nushell
/// beyond themselves. `\` is here for Windows paths this crate builds.
fn allowed(c: char) -> bool {
    c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | ':' | '/' | '\\' | '@' | '+' | '-')
}

pub fn safe_value(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= MAX_VALUE_LEN
        && !value.starts_with('-')
        && !value.split(['/', '\\']).any(|part| part == "..")
        && value.chars().all(allowed)
}

/// A relative folder a caller named. Refuses anything that could leave the
/// root before the path guard is asked - the guard would refuse it too, but
/// this keeps the refusal's wording about scripts rather than paths.
pub fn safe_dir(dir: &str) -> bool {
    dir.is_empty()
        || (safe_value(dir) && !dir.starts_with('/') && !dir.contains('\\') && !dir.contains(':'))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ordinary_names_pass() {
        for name in [
            "dev",
            "build:prod",
            "test-e2e",
            "@scope/pkg",
            "scripts/x.sh",
            "a+b",
        ] {
            assert!(safe_value(name), "{name}");
        }
    }

    #[test]
    fn shell_metacharacters_are_refused() {
        for name in [
            "a&b", "a|b", "a;b", "a b", "$(x)", "`x`", "a'b", "a\"b", "%PATH%", "a^b", "a,b",
            "a=b", "a>b", "a<b", "!x", "(x)", "",
        ] {
            assert!(!safe_value(name), "{name}");
        }
    }

    #[test]
    fn options_and_parents_are_refused() {
        assert!(!safe_value("--eval=x"));
        assert!(!safe_value("../x"));
        assert!(!safe_dir("/etc"));
        assert!(!safe_dir("C:x"));
        assert!(safe_dir(""));
        assert!(safe_dir("apps/ui"));
    }
}
