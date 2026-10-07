import type { ProjectScript } from "@/Types";

import { packageLabel, scriptKey, sourceLabel } from "./labels";
import { SCRIPTS_COPY } from "./messages";
import type { ScriptOption, ScriptSection } from "./types";

/**
 * True when every word of `query` appears somewhere in the script's name,
 * command, package or runner. Words rather than one substring, so `web dev`
 * finds the `dev` script in the `web` package.
 */
export function matches(script: ProjectScript, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [script.name, script.command, packageLabel(script), sourceLabel(script)]
    .join(" ")
    .toLowerCase();
  return words.every((word) => haystack.includes(word));
}

/**
 * The menu's sections, in order: recently run first, then one section per
 * package and source in the order Rust found them - the root, then each
 * workspace member.
 *
 * Every row carries its position in the whole list, because the keyboard
 * moves through all sections as one list. A recent script appears twice -
 * once on top, once in its own section - which is the point of a recent list.
 */
export function buildSections(
  scripts: ProjectScript[],
  recentKeys: string[],
  query: string,
): ScriptSection[] {
  const visible = scripts.filter((script) => matches(script, query));
  const byKey = new Map(visible.map((script) => [scriptKey(script), script]));
  const sections: ScriptSection[] = [];
  let index = 0;
  const option = (script: ProjectScript): ScriptOption => {
    const current = index;
    index += 1;
    return { script, index: current, id: `script-option-${current}` };
  };

  const recent = recentKeys
    .map((key) => byKey.get(key))
    .filter((script): script is ProjectScript => Boolean(script));
  if (recent.length > 0) {
    sections.push({
      key: "recent",
      heading: SCRIPTS_COPY.recentHeading,
      items: recent.map(option),
    });
  }

  const grouped = new Map<string, ProjectScript[]>();
  for (const script of visible) {
    const key = `${script.dir}\u0000${script.source}`;
    grouped.set(key, [...(grouped.get(key) ?? []), script]);
  }
  for (const [key, members] of grouped) {
    const first = members[0];
    sections.push({
      key,
      heading: `${packageLabel(first)} · ${sourceLabel(first)}`,
      items: members.map(option),
    });
  }
  return sections;
}
