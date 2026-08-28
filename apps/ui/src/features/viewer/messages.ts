/**
 * User-facing viewer and editor copy.
 *
 * Kept out of the components so the strings stay shallow and a future
 * translation pass has one file to reach for.
 */
export const VIEWER_COPY = {
  emptyTitle: "No file selected",
  emptyBody: "Choose a file in the tree to read or edit it here.",
  loadingTitle: "Loading…",
  loadingBody: "Reading the file.",
  guardedTitle: "This file is not shown",
  errorTitle: "Could not open this file",

  save: "Save",
  saving: "Saving…",
  saved: "Saved",
  unsaved: "Unsaved changes",
  saveHint: "Save (Ctrl+S)",
  saveErrorTitle: "Could not save",
  /**
   * The lost-update refusal. It has to say what happened *and* that nothing
   * was destroyed, because the natural fear on seeing a failed save is that
   * the work is gone.
   */
  conflict:
    "This file changed on disk after you opened it, so it was not overwritten — your edits are still here. Copy anything you need, then reopen the file to load the newer version.",
} as const;
