//! Gradle and Maven: their standard tasks and lifecycle phases.
//!
//! Neither keeps a list of tasks in a file that can be read without running
//! the tool, so these are the ones every build answers. A project wrapper
//! (`gradlew`, `mvnw`) is preferred over a global install when it is there,
//! because the wrapper is how the project pins its own version.

use crate::types::ScriptSource;

use super::super::model::{
    no_members, no_reads, present, Arg, Candidate, Detector, Folder, Platform, Scope,
};

pub const GRADLE: Detector = Detector {
    source: ScriptSource::Gradle,
    reads: gradle_reads,
    lists: &[],
    detect: gradle_detect,
    members: no_members,
};

pub const MAVEN: Detector = Detector {
    source: ScriptSource::Maven,
    reads: no_reads,
    lists: &[],
    detect: maven_detect,
    members: no_members,
};

const GRADLE_BUILDS: &[&str] = &["build.gradle.kts", "build.gradle"];
const GRADLE_SETTINGS: &[&str] = &["settings.gradle.kts", "settings.gradle"];

fn gradle_reads(folder: &Folder) -> Vec<String> {
    present(folder, GRADLE_BUILDS)
}

/// The wrapper's file name on this platform, if the folder has it.
fn wrapper(
    folder: &Folder,
    platform: Platform,
    unix: &'static str,
    windows: &'static str,
) -> Option<&'static str> {
    let file = match platform {
        Platform::Unix => unix,
        Platform::Windows => windows,
    };
    folder.has(file).then_some(file)
}

/// Runs `./name` on POSIX and `.\name` on Windows: a bare name would be
/// looked up on PATH instead of in the folder.
fn local_program(platform: Platform, file: &'static str) -> &'static str {
    match (platform, file) {
        (Platform::Unix, "gradlew") => "./gradlew",
        (Platform::Windows, "gradlew.bat") => ".\\gradlew.bat",
        (Platform::Unix, "mvnw") => "./mvnw",
        (Platform::Windows, "mvnw.cmd") => ".\\mvnw.cmd",
        _ => file,
    }
}

fn tasks(program: &'static str, names: &[&'static str]) -> Vec<Candidate> {
    names
        .iter()
        .map(|name| Candidate::new(*name, vec![Arg::Fixed(program), Arg::Fixed(name)]))
        .collect()
}

fn gradle_detect(scope: &Scope) -> Vec<Candidate> {
    let folder = scope.folder;
    let build = folder.first_of(GRADLE_BUILDS);
    if build.is_none() && folder.first_of(GRADLE_SETTINGS).is_none() {
        return Vec::new();
    }
    let program = wrapper(folder, scope.platform, "gradlew", "gradlew.bat")
        .map(|file| local_program(scope.platform, file))
        .unwrap_or("gradle");
    // The `application` plugin is what gives a project a `run` task.
    let runs = build
        .and_then(|name| folder.text(name))
        .is_some_and(|text| text.contains("application"));
    let names: &[&'static str] = if runs {
        &["build", "run", "test", "clean"]
    } else {
        &["build", "test", "clean"]
    };
    tasks(program, names)
}

fn maven_detect(scope: &Scope) -> Vec<Candidate> {
    if !scope.folder.has("pom.xml") {
        return Vec::new();
    }
    let program = wrapper(scope.folder, scope.platform, "mvnw", "mvnw.cmd")
        .map(|file| local_program(scope.platform, file))
        .unwrap_or("mvn");
    tasks(program, &["compile", "test", "package", "install", "clean"])
}
