/**
 * Labels for the panel's right-click menus.
 *
 * Only the ones the panel did not already have. The stash and conflict menus
 * reuse their buttons' wording on purpose: those labels say which version is
 * kept and whether an entry survives, and a menu that said it differently
 * would be a second answer to the same question.
 */
export const SOURCE_CONTROL_MENU_COPY = {
  commitType: "Commit type",
  openFile: "Open File",
  openChanges: "Open Changes",
  stage: "Stage",
  unstage: "Unstage",
  discard: "Discard Changes…",
  checkout: "Check Out",
  current: "Already checked out",
  copyBranchName: "Copy Branch Name",
  dropEntry: "Delete Entry…",
  copySha: "Copy Commit Hash",
  copyShortSha: "Copy Short Hash",
  copySubject: "Copy Message",
  showFiles: "Show Files",
  hideFiles: "Hide Files",
} as const;
