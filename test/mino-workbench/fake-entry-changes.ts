import { vi } from "vitest";

import type { DirEntry, EntryChange } from "@/Types";

import { makeEntry } from "./fake-entries";
import type { FakeTransportOptions } from "./fake-options";

/**
 * The fake `changeEntry`, and the record of what it was asked to do.
 *
 * A delete is the one change a DOM query cannot see once the confirmation has
 * closed, so the tests assert on `changes` - which also proves that cancelling
 * a confirmation asked for nothing at all.
 */
export function createFakeEntryChanges(options: FakeTransportOptions) {
  const changes: EntryChange[] = [];

  const changeEntry = vi.fn(async (change: EntryChange): Promise<DirEntry | null> => {
    const failure = options.failures?.[`changeEntry:${change.kind}`];
    if (failure) throw failure;
    changes.push(change);
    switch (change.kind) {
      case "create": {
        const { parent, name, entry } = change.detail;
        return makeEntry(`${parent}/${name}`, {
          kind: entry === "directory" ? "directory" : "file",
          size: 0,
        });
      }
      case "rename": {
        const { path, name } = change.detail;
        const folder = path.slice(0, Math.max(path.lastIndexOf("/"), 0));
        return makeEntry(`${folder}/${name}`);
      }
      case "delete":
        return null;
    }
  });

  return { changeEntry, changes };
}
