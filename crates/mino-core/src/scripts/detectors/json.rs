//! Small readers shared by the JSON-manifest detectors.

use serde_json::Value;

use super::jsonc::strip_jsonc;

/// Parses JSON, or JSON with comments and trailing commas (`deno.jsonc`).
pub fn parse(text: &str) -> Option<Value> {
    serde_json::from_str(text)
        .ok()
        .or_else(|| serde_json::from_str(&strip_jsonc(text)).ok())
}

/// `name` from a manifest, when it is a non-empty string.
pub fn name(value: &Value) -> Option<String> {
    value
        .get("name")
        .and_then(Value::as_str)
        .filter(|name| !name.trim().is_empty())
        .map(str::to_string)
}

/// `(name, what it runs)` for every entry of an object of scripts, where an
/// entry is a string, an array of strings, or an object with `command`.
pub fn entries(value: Option<&Value>) -> Vec<(String, String)> {
    let Some(Value::Object(map)) = value else {
        return Vec::new();
    };
    map.iter()
        .filter_map(|(name, entry)| describe(entry).map(|text| (name.clone(), text)))
        .collect()
}

/// What one script entry runs, for display.
pub fn describe(entry: &Value) -> Option<String> {
    match entry {
        Value::String(text) => Some(text.clone()),
        Value::Array(parts) => Some(
            parts
                .iter()
                .filter_map(Value::as_str)
                .collect::<Vec<_>>()
                .join(" && "),
        ),
        Value::Object(map) => ["command", "cmd"]
            .iter()
            .find_map(|key| map.get(*key))
            .and_then(describe),
        _ => None,
    }
}

/// Every string in an array, or in `{ "packages": [...] }`.
pub fn strings(value: Option<&Value>) -> Vec<String> {
    let list = match value {
        Some(Value::Object(map)) => map.get("packages"),
        other => other,
    };
    list.and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .filter_map(Value::as_str)
                .map(str::to_string)
                .collect()
        })
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn jsonc_comments_and_trailing_commas_are_tolerated() {
        let text = "{ // tasks\n \"tasks\": { \"dev\": \"deno run a.ts\", /* x */ }, // end\n}";
        let value = parse(text).unwrap();
        assert_eq!(
            entries(value.get("tasks")),
            vec![("dev".into(), "deno run a.ts".into())]
        );
    }

    #[test]
    fn a_comment_marker_inside_a_string_is_kept() {
        let value = parse("{ \"a\": \"http://x\", }").unwrap();
        assert_eq!(value["a"], "http://x");
    }
}
