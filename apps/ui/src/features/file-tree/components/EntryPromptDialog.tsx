import type { EntryPromptState } from "../types";
import { EntryDeleteConfirm } from "./EntryDeleteConfirm";
import { EntryNameDialog } from "./EntryNameDialog";

/**
 * Whichever dialog the tree's menu asked for, or nothing.
 *
 * Keyed by what it asks about, so a second question - a rename of another
 * file straight after the first - starts with a fresh box rather than the
 * last one's text.
 */
export function EntryPromptDialog({ state }: { state: EntryPromptState }) {
  const { prompt } = state;
  if (!prompt) return null;
  if (prompt.kind === "delete") {
    return <EntryDeleteConfirm key={prompt.target.path} prompt={prompt} state={state} />;
  }
  const key = prompt.kind === "rename" ? prompt.target.path : `${prompt.parent}:${prompt.entry}`;
  return <EntryNameDialog key={key} prompt={prompt} state={state} />;
}
