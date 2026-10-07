import type { Draft } from "./types";

/**
 * Unsaved edits, kept per file for the life of the session.
 *
 * Switching files in the tree is a normal thing to do mid-edit, and an editor
 * that discarded the buffer each time would lose work for no reason the user
 * could see. So a draft survives navigating away and comes back when the file
 * is opened again.
 *
 * It is memory only: nothing unsaved is written anywhere, which keeps the
 * app's promise that it persists layout preferences and nothing else. The
 * window guard in `useFileEditor` is what covers closing with edits pending.
 */
export class DraftStore {
  private readonly entries = new Map<string, Draft>();

  /** The remembered draft for `path`, or `null` if there is none. */
  get(path: string): Draft | null {
    return this.entries.get(path) ?? null;
  }

  set(path: string, draft: Draft): void {
    this.entries.set(path, draft);
  }

  /** Called after a successful save: there is nothing unsaved to remember. */
  clear(path: string): void {
    this.entries.delete(path);
  }

  /** True when any file has edits that are not on disk. */
  hasUnsaved(): boolean {
    for (const entry of this.entries.values()) {
      if (entry.content !== entry.baseline) return true;
    }
    return false;
  }

  /**
   * Every path with edits that are not on disk.
   *
   * The counterpart of `hasUnsaved`, and the reason it is not enough on its
   * own: a checkout can strand a draft, and a warning that says "you have
   * unsaved changes" without naming the files is a warning nobody can act on.
   * See `features/source-control/hooks/useCheckoutGuard`.
   */
  unsavedPaths(): string[] {
    const paths: string[] = [];
    for (const [path, entry] of this.entries) {
      if (entry.content !== entry.baseline) paths.push(path);
    }
    return paths;
  }

  /**
   * Every path with a remembered draft, saved or not.
   *
   * For the tree's rename and delete: a draft is keyed by path, so a file
   * that moves or goes takes its draft's key with it, and the caller has to
   * move or drop the draft to match.
   */
  paths(): string[] {
    return [...this.entries.keys()];
  }
}
