//! A script as a detector reports it: a name, and the argv that runs it.

/// One argv element. The split is the injection rule made into a type:
/// `Fixed` can only be a string literal in this crate, and `Value` - anything
/// that came out of a file - must pass [`super::safe::safe_value`] before the
/// script is listed, let alone run.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Arg {
    Fixed(&'static str),
    Value(String),
}

impl Arg {
    pub fn as_str(&self) -> &str {
        match self {
            Arg::Fixed(text) => text,
            Arg::Value(text) => text,
        }
    }
}

/// A script a detector found.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Candidate {
    pub name: String,
    pub argv: Vec<Arg>,
    /// Display text. Defaults to the argv joined.
    pub command: String,
    /// The package's own name, where the manifest gives one.
    pub package: Option<String>,
}

impl Candidate {
    pub fn new(name: impl Into<String>, argv: Vec<Arg>) -> Self {
        let command = argv.iter().map(Arg::as_str).collect::<Vec<_>>().join(" ");
        Self {
            name: name.into(),
            argv,
            command,
            package: None,
        }
    }

    pub fn command(mut self, command: impl Into<String>) -> Self {
        self.command = command.into();
        self
    }

    pub fn package(mut self, package: Option<String>) -> Self {
        self.package = package;
        self
    }

    /// The program that runs it, for the menu's runner column.
    pub fn runner(&self) -> &str {
        self.argv.first().map(Arg::as_str).unwrap_or_default()
    }
}
