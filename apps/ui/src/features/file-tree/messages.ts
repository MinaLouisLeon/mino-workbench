/**
 * User-facing copy for the tree's right-click menu and the dialogs it opens.
 *
 * Kept out of the components so the strings stay shallow, and so a future
 * translation pass has one file to reach for.
 */
export const FILE_TREE_COPY = {
  newFile: "New File…",
  newFolder: "New Folder…",
  rename: "Rename…",
  expand: "Expand",
  collapse: "Collapse",
  collapseAll: "Collapse All",
  refresh: "Refresh",
  moveToTrash: "Move to Recycle Bin…",
  deletePermanently: "Delete Permanently…",

  newFileTitle: "New file",
  newFolderTitle: "New folder",
  renameTitle: "Rename",
  inFolder: (folder: string) => `In ${folder}`,
  nameLabel: "Name",
  create: "Create",
  confirmRename: "Rename",
  cancel: "Cancel",
  working: "Working…",

  nameEmpty: "Type a name.",
  nameDots: "That is not a name a file or folder can have.",
  nameSeparator: "A name cannot contain / or \\ - it names one entry, not a path.",
  nameTooLong: "That name is longer than 255 bytes.",

  trashTitle: "Move to Recycle Bin",
  deleteTitle: "Delete permanently",
  trashOne: (name: string) =>
    `${name} will be moved to the Recycle Bin. You can restore it from there.`,
  trashFolder: (name: string) =>
    `${name} and everything in it will be moved to the Recycle Bin. You can restore it from there.`,
  deleteOne: (name: string) => `${name} will be deleted. This cannot be undone.`,
  deleteFolder: (name: string) =>
    `${name} and everything in it will be deleted. This cannot be undone.`,
  unsavedLost: (count: number) =>
    count === 1
      ? "It has unsaved edits in the editor, which will be lost."
      : `${count} files in it have unsaved edits in the editor, which will be lost.`,
  confirmTrash: (name: string) => `Move ${name} to Recycle Bin`,
  confirmDelete: (name: string) => `Delete ${name}`,
} as const;
