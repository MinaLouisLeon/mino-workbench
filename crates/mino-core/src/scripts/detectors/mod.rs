//! The detector table.
//!
//! **Adding an ecosystem is one row here** and one file beside this one: a
//! [`Detector`] says which manifests it wants read, finds scripts in them as a
//! pure function, and optionally names the workspace members its manifest
//! declares. Nothing else in the crate changes, apart from one new
//! [`crate::types::ScriptSource`] variant for the menu to label it by.
//!
//! The order of the table is the order of the menu within a folder: the
//! package scripts people mean to run first, the language toolchains after,
//! and loose script files last.

mod cargo;
mod composer;
mod deno;
mod dotnet;
mod files;
mod go;
mod json;
mod jsonc;
mod jvm;
mod make;
mod npm;
mod python;
mod python_tables;
mod task;

use super::model::{Arg, Detector};

pub static DETECTORS: &[Detector] = &[
    npm::NPM,
    deno::DENO,
    composer::COMPOSER,
    python::PYTHON,
    cargo::CARGO,
    go::GO,
    make::MAKE,
    make::JUST,
    task::TASK,
    jvm::GRADLE,
    jvm::MAVEN,
    dotnet::DOTNET,
    files::FILES,
];

/// Builds an argv of fixed program text with one value from a file at the end.
fn with_value(fixed: &[&'static str], value: &str) -> Vec<Arg> {
    let mut argv: Vec<Arg> = fixed.iter().map(|text| Arg::Fixed(text)).collect();
    argv.push(Arg::Value(value.to_string()));
    argv
}

/// An argv of fixed program text only.
fn fixed(parts: &[&'static str]) -> Vec<Arg> {
    parts.iter().map(|text| Arg::Fixed(text)).collect()
}
