/**
 * Creating, renaming and deleting entries - `Transport::change_entry`.
 *
 * A module of its own rather than three more lines in `./api`, which is at
 * the file ceiling. It is still a method of `TransportClient`, not a separate
 * surface like `client.git`: the Rust side is one method on `Transport`, and
 * `TransportClient` takes it in through `extends EntryClient`.
 */
import type { DirEntry, EntryChange } from "../generated";

/** Tauri command names for this module. */
export const ENTRY_COMMANDS = {
  changeEntry: "change_entry",
} as const;

export type EntryCommand = (typeof ENTRY_COMMANDS)[keyof typeof ENTRY_COMMANDS];

export type ChangeEntryArgs = { change: EntryChange };

export interface EntryClient {
  /**
   * Makes a file or folder, renames one in place, or deletes one, and returns
   * the entry as it now stands - `null` after a delete.
   *
   * A name is one path segment, checked in Rust. `Trash` is answered by the
   * local transport only; a remote host has no recycle bin to reach.
   */
  changeEntry(change: EntryChange): Promise<DirEntry | null>;
}
