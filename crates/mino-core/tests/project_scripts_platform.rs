//! The detectors whose answer depends on the platform: Gradle and Maven
//! wrappers, .NET's project resolution, and loose script files.

use mino_core::scripts::Platform;
use mino_core::types::ScriptSource;

mod fixture;
use fixture::scripts::{folder, found, names, one, with_child};

#[test]
fn the_gradle_wrapper_is_preferred_and_spelled_per_platform() {
    let files = [
        ("build.gradle.kts", "plugins { application }"),
        ("gradlew", ""),
        ("gradlew.bat", ""),
    ];
    let root = folder("", &files);
    let unix = found(&root, Platform::Unix);
    assert_eq!(
        names(&unix, ScriptSource::Gradle),
        ["build", "run", "test", "clean"]
    );
    assert_eq!(
        one(&unix, ScriptSource::Gradle, "build").runner,
        "./gradlew"
    );
    let windows = found(&root, Platform::Windows);
    assert_eq!(
        one(&windows, ScriptSource::Gradle, "build").runner,
        ".\\gradlew.bat"
    );

    let bare = folder("", &[("build.gradle", "plugins { id 'java' }")]);
    let scripts = found(&bare, Platform::Unix);
    assert_eq!(
        names(&scripts, ScriptSource::Gradle),
        ["build", "test", "clean"]
    );
    assert_eq!(one(&scripts, ScriptSource::Gradle, "test").runner, "gradle");
}

#[test]
fn maven_uses_its_wrapper_when_present() {
    let root = folder("", &[("pom.xml", ""), ("mvnw", "")]);
    let scripts = found(&root, Platform::Unix);
    assert_eq!(
        one(&scripts, ScriptSource::Maven, "package").command,
        "./mvnw package"
    );
}

#[test]
fn dotnet_names_a_target_only_when_it_would_have_to_guess() {
    let single = folder("", &[("Api.csproj", "")]);
    let scripts = found(&single, Platform::Unix);
    assert_eq!(
        names(&scripts, ScriptSource::Dotnet),
        ["build", "run", "test"]
    );
    assert_eq!(
        one(&scripts, ScriptSource::Dotnet, "build").command,
        "dotnet build"
    );

    let both = folder("", &[("App.sln", ""), ("Api.csproj", "")]);
    let scripts = found(&both, Platform::Unix);
    assert_eq!(
        one(&scripts, ScriptSource::Dotnet, "build").command,
        "dotnet build App.sln"
    );
    assert_eq!(
        one(&scripts, ScriptSource::Dotnet, "run").command,
        "dotnet run --project Api.csproj"
    );

    let solution = folder("", &[("App.sln", "")]);
    assert_eq!(
        names(&found(&solution, Platform::Unix), ScriptSource::Dotnet),
        ["build", "test"]
    );
}

#[test]
fn root_script_files_run_under_their_interpreter() {
    let files = [
        ("deploy.sh", ""),
        ("setup.ps1", ""),
        ("build.bat", ""),
        ("manage.py", ""),
        ("setup.py", ""),
        ("eslint.config.js", ""),
        (".hidden.sh", ""),
    ];
    let root = folder("", &files);

    let unix = found(&root, Platform::Unix);
    assert_eq!(
        names(&unix, ScriptSource::File),
        ["deploy.sh", "manage.py", "setup.ps1"]
    );
    assert_eq!(
        one(&unix, ScriptSource::File, "manage.py").command,
        "python3 manage.py"
    );
    assert_eq!(
        one(&unix, ScriptSource::File, "setup.ps1").command,
        "pwsh -NoProfile -File setup.ps1"
    );

    let windows = found(&root, Platform::Windows);
    assert_eq!(
        one(&windows, ScriptSource::File, "build.bat").command,
        ".\\build.bat"
    );
    assert_eq!(
        one(&windows, ScriptSource::File, "deploy.sh").command,
        "bash deploy.sh"
    );
}

#[test]
fn the_scripts_folder_also_holds_node_scripts() {
    let root = with_child(folder("", &[]), "scripts", &["gen-types.mjs", "release.sh"]);
    let windows = found(&root, Platform::Windows);
    assert_eq!(
        names(&windows, ScriptSource::File),
        ["scripts/gen-types.mjs", "scripts/release.sh"]
    );
    assert_eq!(
        one(&windows, ScriptSource::File, "scripts/gen-types.mjs").command,
        "node scripts\\gen-types.mjs"
    );
    let unix = found(&root, Platform::Unix);
    assert_eq!(
        one(&unix, ScriptSource::File, "scripts/release.sh").command,
        "sh scripts/release.sh"
    );
}
