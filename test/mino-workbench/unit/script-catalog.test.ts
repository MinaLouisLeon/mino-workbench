import { describe, expect, it } from "vitest";

import { buildSections, matches } from "@/features/scripts/catalog";
import { packageLabel, scriptKey, scriptLabel } from "@/features/scripts/labels";

import { makeScript, WORKSPACE_SCRIPTS } from "../fake-scripts";

/**
 * The menu's pure half: how a script is named, what a filter matches, and the
 * order the sections come in. The component tests take these for granted.
 */
describe("script labels", () => {
  it("names npm scripts by the manager that runs them", () => {
    expect(scriptLabel(makeScript({ runner: "yarn" }))).toBe("yarn: dev");
    expect(scriptLabel(makeScript({ source: "make", name: "build", runner: "make" }))).toBe(
      "make: build",
    );
    expect(scriptLabel(makeScript({ source: "file", name: "scripts/x.sh", runner: "sh" }))).toBe(
      "script: scripts/x.sh",
    );
  });

  it("falls back from the package name to the folder, then to the root", () => {
    expect(packageLabel(makeScript({ package: "web" }))).toBe("web");
    expect(packageLabel(makeScript({ package: "", dir: "apps/api" }))).toBe("apps/api");
    expect(packageLabel(makeScript({ package: "", dir: "" }))).toBe("This folder");
  });

  it("keys a script by the three fields Rust looks it up by", () => {
    const root = makeScript({ name: "dev" });
    const member = makeScript({ name: "dev", dir: "packages/web" });
    expect(scriptKey(root)).not.toBe(scriptKey(member));
    expect(scriptKey(root)).toBe(scriptKey({ source: "npm", dir: "", name: "dev" }));
  });
});

describe("filtering", () => {
  it("matches every word against name, command, package and runner", () => {
    const start = WORKSPACE_SCRIPTS[3];
    expect(matches(start, "")).toBe(true);
    expect(matches(start, "web start")).toBe(true);
    expect(matches(start, "NEXT")).toBe(true);
    expect(matches(start, "pnpm")).toBe(true);
    expect(matches(start, "web build")).toBe(false);
  });
});

describe("sections", () => {
  it("groups by package and source, in the order Rust found them", () => {
    const sections = buildSections(WORKSPACE_SCRIPTS, [], "");
    expect(sections.map((s) => s.heading)).toEqual([
      "acme · pnpm",
      "This folder · make",
      "web · pnpm",
    ]);
    expect(sections.flatMap((s) => s.items.map((i) => i.index))).toEqual([0, 1, 2, 3]);
  });

  it("puts recently run scripts first, most recent first", () => {
    const recent = [scriptKey(WORKSPACE_SCRIPTS[3]), scriptKey(WORKSPACE_SCRIPTS[2])];
    const sections = buildSections(WORKSPACE_SCRIPTS, recent, "");
    expect(sections[0].heading).toBe("Recent");
    expect(sections[0].items.map((i) => i.script.name)).toEqual(["start", "release"]);
    // Still in their own sections too, with their own positions.
    expect(sections.flatMap((s) => s.items)).toHaveLength(6);
    expect(new Set(sections.flatMap((s) => s.items.map((i) => i.id))).size).toBe(6);
  });

  it("forgets a recent script the folder no longer defines", () => {
    const gone = scriptKey(makeScript({ name: "deleted" }));
    const sections = buildSections(WORKSPACE_SCRIPTS, [gone], "");
    expect(sections[0].heading).not.toBe("Recent");
  });

  it("applies the filter to the recent section as well", () => {
    const recent = [scriptKey(WORKSPACE_SCRIPTS[0])];
    const sections = buildSections(WORKSPACE_SCRIPTS, recent, "release");
    expect(sections.map((s) => s.heading)).toEqual(["This folder · make"]);
  });
});
