import { describe, expect, it } from "vitest";

import { entryNameProblem, stemLength } from "@/features/file-tree/entryName";
import { withCommitType } from "@/features/source-control/commitTypes";
import { action, hasActions, heading, separator, tidyEntries } from "@/lib/menu";
import { dirname, isWithin, joinPath, relativeTo } from "@/lib/path";

const noop = () => undefined;

describe("tidyEntries", () => {
  it("drops separators at the ends and in a row", () => {
    const entries = tidyEntries([
      separator(),
      action("a", "A", noop),
      separator(),
      separator(),
      action("b", "B", noop),
      separator(),
    ]);
    expect(entries.map((entry) => entry.kind)).toEqual(["action", "separator", "action"]);
  });

  it("counts only actions as something to show", () => {
    expect(hasActions([heading("h", "Heading"), separator()])).toBe(false);
    expect(hasActions([action("a", "A", noop)])).toBe(true);
  });
});

describe("path helpers for the menus", () => {
  it("finds the folder on both separators", () => {
    expect(dirname("/root/src/main.rs")).toBe("/root/src");
    expect(dirname("C:\\code\\app\\main.rs")).toBe("C:\\code\\app");
    expect(dirname("/main.rs")).toBe("/");
  });

  it("knows what sits inside what, without prefix accidents", () => {
    expect(isWithin("/root/src/main.rs", "/root/src")).toBe(true);
    expect(isWithin("/root/src", "/root/src")).toBe(true);
    expect(isWithin("/root/srcs/main.rs", "/root/src")).toBe(false);
    expect(isWithin("C:\\code\\app\\x.rs", "C:\\code\\app")).toBe(true);
  });

  it("makes a relative path in / style", () => {
    expect(relativeTo("/root", "/root/src/main.rs")).toBe("src/main.rs");
    expect(relativeTo("C:\\code", "C:\\code\\src\\main.rs")).toBe("src/main.rs");
    expect(relativeTo("/root", "/root")).toBe(".");
    expect(relativeTo("/root", "/elsewhere/x")).toBe("/elsewhere/x");
  });

  it("joins in the folder's own style", () => {
    expect(joinPath("/root/src", "a.rs")).toBe("/root/src/a.rs");
    expect(joinPath("C:\\code", "a.rs")).toBe("C:\\code\\a.rs");
  });
});

describe("entry names", () => {
  it("accepts an ordinary name and refuses paths and dots", () => {
    expect(entryNameProblem("main.rs")).toBeNull();
    expect(entryNameProblem("")).not.toBeNull();
    expect(entryNameProblem("   ")).not.toBeNull();
    expect(entryNameProblem("..")).not.toBeNull();
    expect(entryNameProblem("src/main.rs")).not.toBeNull();
    expect(entryNameProblem("..\\escape")).not.toBeNull();
    expect(entryNameProblem("a".repeat(256))).not.toBeNull();
  });

  it("selects the stem for a rename, and all of a dot-file", () => {
    expect(stemLength("notes.md")).toBe(5);
    expect(stemLength("archive.tar.gz")).toBe(11);
    expect(stemLength(".gitignore")).toBe(10);
    expect(stemLength("Makefile")).toBe(8);
  });
});

describe("withCommitType", () => {
  it("puts a type in front of a message without one", () => {
    expect(withCommitType("add the menu", "feat")).toEqual({ replace: 0, insert: "feat: " });
  });

  it("swaps an existing type, keeping the scope and the bang", () => {
    expect(withCommitType("fix(tree): rename", "feat")).toEqual({
      replace: 11,
      insert: "feat(tree): ",
    });
    expect(withCommitType("refactor!: drop api", "feat")).toEqual({
      replace: 11,
      insert: "feat!: ",
    });
  });
});
