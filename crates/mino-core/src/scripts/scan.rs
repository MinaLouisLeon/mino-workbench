//! Building the catalog, and finding one script in it again.

use crate::error::{Result, TransportError};
use crate::types::{ProjectScript, ScriptCatalog, ScriptRef, MAX_SCRIPTS, MAX_SCRIPT_MEMBERS};

use super::detectors::DETECTORS;
use super::members::expand;
use super::model::{Arg, Candidate, Folder, Platform, Scope};
use super::safe::{safe_dir, safe_value};
use super::source::{read_folder, ScanSource};

/// Every script in `folder`, as the detector table finds them.
///
/// Public so detectors can be tested against a hand-built [`Folder`]. A script
/// whose argv holds a value [`safe_value`] refuses is counted, not listed.
pub fn detect(folder: &Folder, root: &Folder, platform: Platform) -> (Vec<ProjectScript>, u32) {
    let scope = Scope {
        folder,
        root,
        platform,
    };
    let mut scripts: Vec<ProjectScript> = Vec::new();
    let mut skipped = 0;
    for detector in DETECTORS {
        for candidate in (detector.detect)(&scope) {
            if !runnable(&candidate) {
                skipped += 1;
                continue;
            }
            let duplicate = scripts
                .iter()
                .any(|s| s.source == detector.source && s.name == candidate.name);
            if duplicate {
                continue;
            }
            scripts.push(ProjectScript {
                source: detector.source,
                dir: folder.dir.clone(),
                package: candidate
                    .package
                    .clone()
                    .unwrap_or_else(|| folder.dir.clone()),
                runner: candidate.runner().to_string(),
                name: candidate.name.clone(),
                command: candidate.command.clone(),
            });
        }
    }
    (scripts, skipped)
}

fn runnable(candidate: &Candidate) -> bool {
    candidate.argv.iter().all(|arg| match arg {
        Arg::Fixed(_) => true,
        Arg::Value(value) => safe_value(value),
    })
}

/// The workspace members `folder` declares, across every ecosystem.
fn member_patterns(folder: &Folder, platform: Platform) -> Vec<String> {
    let scope = Scope {
        folder,
        root: folder,
        platform,
    };
    DETECTORS.iter().flat_map(|d| (d.members)(&scope)).collect()
}

/// The root, then each declared workspace member.
pub async fn scan(source: &dyn ScanSource, platform: Platform) -> Result<ScriptCatalog> {
    let root = read_folder(source, "").await?;
    let mut catalog = ScriptCatalog::default();
    add(&mut catalog, detect(&root, &root, platform));

    let mut members = expand(source, "", &member_patterns(&root, platform)).await;
    members.retain(|dir| !dir.is_empty());
    if members.len() > MAX_SCRIPT_MEMBERS {
        members.truncate(MAX_SCRIPT_MEMBERS);
        catalog.truncated = true;
    }
    for dir in members {
        // A member that has gone, or that the guard refuses, is not worth
        // failing the whole menu over.
        if let Ok(folder) = read_folder(source, &dir).await {
            add(&mut catalog, detect(&folder, &root, platform));
        }
    }

    if catalog.scripts.len() > MAX_SCRIPTS {
        catalog.scripts.truncate(MAX_SCRIPTS);
        catalog.truncated = true;
    }
    Ok(catalog)
}

fn add(catalog: &mut ScriptCatalog, (scripts, skipped): (Vec<ProjectScript>, u32)) {
    catalog.scripts.extend(scripts);
    catalog.skipped += skipped;
}

/// The argv for `script`, read fresh from the folder it names.
///
/// Nothing the caller sent is used but the three fields that identify the
/// script: the program text comes from the detector, exactly as when it was
/// listed, so a manifest edited since the menu was opened runs as it now
/// reads - or is refused, if the script is gone.
pub async fn resolve(
    source: &dyn ScanSource,
    platform: Platform,
    script: &ScriptRef,
) -> Result<Vec<String>> {
    if !safe_dir(&script.dir) {
        return Err(TransportError::invalid(format!(
            "`{}` is not a folder a script can run in",
            script.dir
        )));
    }
    let root = read_folder(source, "").await?;
    let folder = if script.dir.is_empty() {
        root.clone()
    } else {
        read_folder(source, &script.dir).await?
    };
    let scope = Scope {
        folder: &folder,
        root: &root,
        platform,
    };
    DETECTORS
        .iter()
        .filter(|detector| detector.source == script.source)
        .flat_map(|detector| (detector.detect)(&scope))
        .find(|candidate| candidate.name == script.name && runnable(candidate))
        .map(|candidate| candidate.argv.iter().map(|a| a.as_str().to_string()).collect())
        .ok_or_else(|| {
            TransportError::invalid(format!(
                "this folder no longer defines a script called `{}` - reopen the menu to see what it has now",
                script.name
            ))
        })
}
