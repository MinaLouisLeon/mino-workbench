//! The `pyproject.toml` detector: entry points through the project's
//! environment manager, and the task tables each run by their own tool.

use mino_core::scripts::Platform;
use mino_core::types::ScriptSource;

mod fixture;
use fixture::scripts::{folder, found, names, one};

#[test]
fn python_entry_points_run_inside_the_projects_environment() {
    let text = "\
[project]
name = \"acme\"
[project.scripts]
acme-cli = \"acme.cli:main\"
[tool.poe.tasks]
lint = \"ruff check .\"
fmt = { cmd = \"ruff format .\" }
";
    let root = folder("", &[("pyproject.toml", text), ("uv.lock", "")]);
    let scripts = found(&root, Platform::Unix);
    let cli = one(&scripts, ScriptSource::Python, "acme-cli");
    assert_eq!(cli.runner, "uv");
    assert_eq!(cli.command, "acme.cli:main");
    assert_eq!(cli.package, "acme");
    assert_eq!(
        one(&scripts, ScriptSource::Python, "fmt").command,
        "ruff format ."
    );
    assert_eq!(one(&scripts, ScriptSource::Python, "lint").runner, "uv");
}

#[test]
fn pdm_scripts_skip_the_shared_settings_table() {
    let text = "\
[tool.pdm.scripts]
_ = { env_file = \".env\" }
start = \"flask run\"
";
    let root = folder("", &[("pyproject.toml", text)]);
    let scripts = found(&root, Platform::Unix);
    assert_eq!(names(&scripts, ScriptSource::Python), ["start"]);
    assert_eq!(one(&scripts, ScriptSource::Python, "start").runner, "pdm");
}
