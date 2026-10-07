/**
 * The system clipboard, for the context menus.
 *
 * Every call here runs from a menu click, which is the user gesture the
 * Clipboard API asks for. A refusal - a browser that denies the read, a
 * webview without the permission - resolves to "nothing happened" rather than
 * throwing: a paste that did nothing is visible to the reader, and there is
 * no better sentence to show them from inside a menu that has already closed.
 *
 * Text only. Nothing read from here is stored anywhere.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** The clipboard's text, or `null` when it is empty or cannot be read. */
export async function readText(): Promise<string | null> {
  try {
    const text = await navigator.clipboard.readText();
    return text === "" ? null : text;
  } catch {
    return null;
  }
}
