//! The JSON-manifest detectors: npm and its package managers, Deno, Composer.

use mino_core::scripts::{detect, Platform};
use mino_core::types::ScriptSource;

mod fixture;
use fixture::scripts::{folder, found, names, one};

const PACKAGE: &str = r#"{
  "name": "@acme/web",
  "scripts": { "dev": "vite", "build": "vite build", "test:e2e": "playwright test" }
}"#;

#[test]
fn package_json_scripts_run_with_npm_by_default() {
    let root = folder("", &[("package.json", PACKAGE)]);
    let scripts = found(&root, Platform::Unix);
    assert_eq!(
        names(&scripts, ScriptSource::Npm),
        ["build", "dev", "test:e2e"]
    );
    let dev = one(&scripts, ScriptSource::Npm, "dev");
    assert_eq!(dev.runner, "npm");
    assert_eq!(dev.command, "vite");
    assert_eq!(dev.package, "@acme/web");
}

#[test]
fn the_lockfile_names_the_package_manager() {
    for (lock, manager) in [
        ("pnpm-lock.yaml", "pnpm"),
        ("yarn.lock", "yarn"),
        ("bun.lockb", "bun"),
        ("package-lock.json", "npm"),
    ] {
        let root = folder("", &[("package.json", PACKAGE), (lock, "")]);
        let dev = one(&found(&root, Platform::Unix), ScriptSource::Npm, "dev");
        assert_eq!(dev.runner, manager, "{lock}");
    }
}

#[test]
fn the_package_manager_field_wins_over_a_lockfile() {
    let manifest = r#"{ "packageManager": "pnpm@9.1.0", "scripts": { "dev": "vite" } }"#;
    let root = folder("", &[("package.json", manifest), ("yarn.lock", "")]);
    let dev = one(&found(&root, Platform::Unix), ScriptSource::Npm, "dev");
    assert_eq!(dev.runner, "pnpm");
}

#[test]
fn a_workspace_member_uses_the_root_lockfile() {
    let root = folder("", &[("package.json", "{}"), ("pnpm-lock.yaml", "")]);
    let member = folder("packages/web", &[("package.json", PACKAGE)]);
    let (scripts, _) = detect(&member, &root, Platform::Unix);
    let dev = one(&scripts, ScriptSource::Npm, "dev");
    assert_eq!(dev.runner, "pnpm");
    assert_eq!(dev.dir, "packages/web");
}

#[test]
fn a_name_a_shell_would_read_is_counted_not_listed() {
    let manifest = r#"{ "scripts": {
        "ok": "x", "a&calc": "x", "b c": "x", "--eval": "x", "$(id)": "x", "%PATH%": "x"
    } }"#;
    let root = folder("", &[("package.json", manifest)]);
    let (scripts, skipped) = detect(&root, &root, Platform::Windows);
    assert_eq!(names(&scripts, ScriptSource::Npm), ["ok"]);
    assert_eq!(skipped, 5);
}

#[test]
fn a_broken_manifest_finds_nothing_rather_than_failing() {
    let root = folder("", &[("package.json", "{ not json")]);
    assert!(found(&root, Platform::Unix).is_empty());
}

#[test]
fn deno_tasks_are_read_from_jsonc() {
    let text = r#"{
      // the dev server
      "tasks": {
        "dev": "deno run --watch main.ts",
        "check": { "command": "deno check main.ts", "description": "types" },
      },
    }"#;
    let root = folder("", &[("deno.jsonc", text)]);
    let scripts = found(&root, Platform::Unix);
    assert_eq!(names(&scripts, ScriptSource::Deno), ["check", "dev"]);
    let check = one(&scripts, ScriptSource::Deno, "check");
    assert_eq!(check.runner, "deno");
    assert_eq!(check.command, "deno check main.ts");
}

#[test]
fn composer_scripts_join_a_list_of_commands() {
    let text = r#"{ "name": "acme/api", "scripts": {
        "test": "phpunit", "ci": ["@lint", "@test"]
    } }"#;
    let root = folder("", &[("composer.json", text)]);
    let scripts = found(&root, Platform::Unix);
    let ci = one(&scripts, ScriptSource::Composer, "ci");
    assert_eq!(ci.command, "@lint && @test");
    assert_eq!(ci.runner, "composer");
    assert_eq!(ci.package, "acme/api");
}
