# Flow: context menus

Right-click anywhere in the window opens **this app's** menu for the thing
under the pointer, or nothing at all. The browser's own menu - Back, Reload,
Inspect - never opens, in production or in a dev build. Reload in particular
would throw away every unsaved draft. Developer tools are still reachable in a
debug build from the keyboard (F12, or Ctrl+Shift+I).

**Files**

| Concern | Path |
| --- | --- |
| The one menu, and the document listener | `apps/ui/src/context/ContextMenuContext.tsx`, `apps/ui/src/hooks/useNativeMenuSuppression.ts` |
| Giving an element its own menu | `apps/ui/src/hooks/useContextMenu.ts` |
| Drawing it: position, focus, dismissal | `apps/ui/src/components/ui/{ContextMenu,MenuItem}.tsx`, `apps/ui/src/hooks/useContextMenuSurface.ts` |
| Entry builders, shared labels | `apps/ui/src/lib/{menu,menuCopy}.ts` |
| Text fields | `apps/ui/src/lib/{textField,textFieldMenu}.ts` |
| Clipboard | `apps/ui/src/lib/clipboard.ts` |

## Two layers

```
right-click
  │
  ├─ an element with useContextMenu?  ── yes ─▶ its own entries (innermost wins,
  │                                              the event stops there)
  │
  └─ no ─▶ document listener (useNativeMenuSuppression)
             ├─ always: preventDefault - the browser's menu is cancelled
             ├─ a text <input>/<textarea>  ─▶ Cut · Copy · Paste · Select All
             ├─ text selected on the page   ─▶ Copy
             └─ anything else               ─▶ nothing
```

A feature's menu is built **at the moment of the click** by a hook in that
feature's `hooks/` folder, so it reflects what is true then - the terminal's
selection, the editor's undo history, whether a row is busy. Components only
attach the handler: `onContextMenu={useXMenu()}`.

Every entry that changes something reaches an action the area already had -
the menu is a second way in, never a second implementation. Where the row's
button asks before acting (discard, stash drop, deletes), so does the menu.

## What each area offers

| Area | Entries |
| --- | --- |
| File tree row | Open / Expand · New File… · New Folder… · Rename… · Copy Path · Copy Relative Path · Move to Recycle Bin… *(local only)* · Delete Permanently… |
| File tree background | New File… · New Folder… (at the root) · Collapse All · Refresh |
| Editor | Undo · Redo · Cut · Copy · Paste · Select All · Save · Copy Path · Copy Relative Path |
| Terminal | Copy · Paste · Select All · Clear · Split Terminal · Close this terminal |
| Commit message | Cut · Copy · Paste · Select All · **Commit type**: feat, fix, docs, refactor, test, perf, style, build, ci, chore |
| Any other text field | Cut · Copy · Paste · Select All |
| Search result | Open · Copy Path · Copy Relative Path |
| Changed file | Open File · Open Changes · Stage/Unstage · Discard Changes… · Copy Path · Copy Relative Path |
| Branch | Check Out · Copy Branch Name |
| Stash entry | Apply, keeping this entry · Apply and remove this entry · Delete Entry… |
| Conflict | Open · Keep this branch's version · Keep the incoming version · Mark as settled · Copy Path |
| History commit / its file | Show/Hide Files · Copy Commit Hash · Copy Short Hash · Copy Message / Open Changes · Copy Relative Path |
| Pull request | Show/Hide Description · Review · Open on GitHub · Copy Link |
| Issue | Open on GitHub · Copy Link |

Disabled entries stay visible with the reason on hover - "Nothing is
selected", "Four shells is the most this pane will hold" - rather than
disappearing, so the menu has the same shape every time. The two exceptions
are entries that can *never* apply: the recycle bin over SSH, and discard on a
staged or untracked file, which are left out exactly where the row's own
button is.

### Details worth knowing

- **Text fields** keep their undo history. Edits go through
  `document.execCommand("insertText")`, which is deprecated but the only way to
  edit a field that the browser's Ctrl+Z still understands. The field's
  selection is captured when the menu opens, because the menu takes focus.
- **Passwords** are never copied or cut, matching every browser.
- **The editor** edits through CodeMirror transactions, so menu edits are on
  CodeMirror's undo stack and reach the draft like typing.
- **The terminal** pastes through `terminal.paste`, so a multi-line paste is
  bracketed for the shell and does not run line by line. It shows no shortcut
  hints: in a shell, Ctrl+C interrupts.
- **Commit types** swap an existing type rather than stacking a second one,
  and keep its `(scope)` and `!`: `fix(tree): …` → `feat(tree): …`.
- **"Open on GitHub"** goes through `openExternal`, the same origin check and
  system browser as the row's link button. "Copy Link" copies text; nothing
  renders it.

## Keyboard and dismissal

The Menu key or Shift+F10 on a focused element opens its menu at the element.
The first enabled entry takes focus; Up/Down/Home/End move, wrapping; Enter or
Space chooses. Escape, Tab, a press outside, scrolling, resizing and the window
losing focus all close it, and focus returns to what was right-clicked. The
menu is measured on open and flipped up or left rather than clipped at a
window edge.

## What must never happen

- The browser's menu opening anywhere. `useNativeMenuSuppression` cancels
  every `contextmenu` event nobody else claimed.
- A menu entry that changes the filesystem or git without the confirmation its
  button would have shown.
- Clipboard text being stored anywhere. `lib/clipboard.ts` reads and writes the
  system clipboard on a click and keeps nothing.
