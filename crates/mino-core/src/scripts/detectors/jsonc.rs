//! JSON with comments and trailing commas, as `deno.jsonc` is written,
//! turned into JSON `serde_json` will read.

type Cursor<'a> = std::iter::Peekable<std::str::Chars<'a>>;

/// Drops `//` and `/* */` comments outside strings, then trailing commas.
pub fn strip_jsonc(text: &str) -> String {
    trailing_commas(&comments(text))
}

/// Calls `on_code` for each character outside a string, copying string
/// contents (escapes included) through untouched.
fn outside_strings(text: &str, mut on_code: impl FnMut(char, &mut Cursor, &mut String)) -> String {
    let mut out = String::with_capacity(text.len());
    let mut chars = text.chars().peekable();
    let mut in_string = false;
    while let Some(c) = chars.next() {
        if in_string {
            out.push(c);
            match c {
                '\\' => out.extend(chars.next()),
                '"' => in_string = false,
                _ => {}
            }
        } else if c == '"' {
            in_string = true;
            out.push(c);
        } else {
            on_code(c, &mut chars, &mut out);
        }
    }
    out
}

fn comments(text: &str) -> String {
    outside_strings(text, |c, chars, out| match (c, chars.peek()) {
        ('/', Some('/')) => {
            for next in chars.by_ref() {
                if next == '\n' {
                    out.push('\n');
                    break;
                }
            }
        }
        ('/', Some('*')) => {
            chars.next();
            let mut last = ' ';
            for next in chars.by_ref() {
                if last == '*' && next == '/' {
                    break;
                }
                last = next;
            }
        }
        _ => out.push(c),
    })
}

fn trailing_commas(text: &str) -> String {
    outside_strings(text, |c, chars, out| {
        let next = chars.clone().find(|next| !next.is_whitespace());
        if c != ',' || !matches!(next, Some('}' | ']')) {
            out.push(c);
        }
    })
}
