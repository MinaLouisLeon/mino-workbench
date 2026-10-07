//! .NET: `dotnet build`, `test` and `run` where a solution or project is.
//!
//! `dotnet` refuses to guess when a folder holds more than one project or
//! solution, so in that case the first one is named explicitly rather than
//! offering a command that would only print that refusal.

use crate::types::ScriptSource;

use super::super::model::{no_members, no_reads, Arg, Candidate, Detector, Folder, Scope};

pub const DOTNET: Detector = Detector {
    source: ScriptSource::Dotnet,
    reads: no_reads,
    lists: &[],
    detect,
    members: no_members,
};

const SOLUTIONS: &[&str] = &[".sln", ".slnx"];
const PROJECTS: &[&str] = &[".csproj", ".fsproj", ".vbproj"];

fn with_extension<'a>(folder: &'a Folder, extensions: &[&str]) -> Vec<&'a str> {
    folder
        .files
        .iter()
        .map(String::as_str)
        .filter(|name| extensions.iter().any(|ext| name.ends_with(ext)))
        .collect()
}

/// The command, with `target` appended when `dotnet` would need one.
fn command(verb: &'static str, target: Option<&str>) -> Vec<Arg> {
    let mut argv = vec![Arg::Fixed("dotnet"), Arg::Fixed(verb)];
    if let Some(target) = target {
        if verb == "run" {
            argv.push(Arg::Fixed("--project"));
        }
        argv.push(Arg::Value(target.to_string()));
    }
    argv
}

fn detect(scope: &Scope) -> Vec<Candidate> {
    let solutions = with_extension(scope.folder, SOLUTIONS);
    let projects = with_extension(scope.folder, PROJECTS);
    if solutions.is_empty() && projects.is_empty() {
        return Vec::new();
    }

    // `dotnet` takes the folder's only solution or project unasked, and
    // refuses when there are two of anything - a solution beside its project
    // included.
    let ambiguous = solutions.len() + projects.len() > 1;
    let build_target = ambiguous
        .then(|| solutions.first().or(projects.first()).copied())
        .flatten();
    let mut found = vec![
        Candidate::new("build", command("build", build_target)),
        Candidate::new("test", command("test", build_target)),
    ];
    // A solution cannot be run; only a project can.
    if let Some(first) = projects.first() {
        let run_target = ambiguous.then_some(*first);
        found.insert(1, Candidate::new("run", command("run", run_target)));
    }
    found
}
