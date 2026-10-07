//! `composer.json` scripts, run with `composer run-script`.

use crate::types::ScriptSource;

use super::super::model::{no_members, present, Candidate, Detector, Folder, Scope};
use super::{json, with_value};

pub const COMPOSER: Detector = Detector {
    source: ScriptSource::Composer,
    reads,
    lists: &[],
    detect,
    members: no_members,
};

const MANIFEST: &str = "composer.json";

fn reads(folder: &Folder) -> Vec<String> {
    present(folder, &[MANIFEST])
}

fn detect(scope: &Scope) -> Vec<Candidate> {
    let Some(value) = scope.folder.text(MANIFEST).and_then(json::parse) else {
        return Vec::new();
    };
    let package = json::name(&value);
    json::entries(value.get("scripts"))
        .into_iter()
        .map(|(name, body)| {
            Candidate::new(name.clone(), with_value(&["composer", "run-script"], &name))
                .command(body)
                .package(package.clone())
        })
        .collect()
}
